/** Czech copy for M04. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Terms a Czech engineer keeps in English stay in English — prompt, workflow,
 * agent, fallback, enum, token limit, lookup tabulka, confidence — and each is
 * glossed once where it first appears. */

import type { ModuleCs } from '../../types';

export const FDE_M04_CS: ModuleCs = {
  title: 'Volby v systémech s AI',
  outcomes: [
    'Pojmenovat čtyři systémy, které odpovídají na zadání „přidejte tam AI“, a říct, co každý z nich stojí na jeden požadavek penězi, latencí a nepředvídatelností.',
    'Vybrat příčku podle omezení, které jsi dostal, ne podle technologie ze zadání, a obhájit deterministické směrování tam, kde je správnou odpovědí.',
    'Říct, co odpověď svázaná JSON schématem zaručuje a co nechává úplně otevřené.',
    'Ověřit odpověď modelu na hranici: vytáhnout ji, naparsovat, zkontrolovat pole, zkontrolovat rozsahy a při selhání vrátit důvod z pevného slovníku.',
    'Vybrat mezi zdržením se odpovědi, jedním opakovaným voláním a návratem k deterministickému pravidlu, a říct, co každá volba stojí operátora.',
  ],
  lessons: {
    'fde-v1-m04-l1': {
      title: 'Deterministický kód, jedno volání modelu, workflow, agent',
      summary:
        'Čtyři systémy odpovídají na totéž zadání. Co každá příčka stojí na jeden ticket, která omezení kterou příčku vyřadí a proč tak často zůstane stát právě deterministické směrování.',
      sections: [
        {
          body:
            'Vedoucí podpory v Marlbrooku chce AI triage: něco, co přečte příchozí ticket a zařadí ho do správné fronty. Na tu větu odpovídají čtyři různé systémy. Lookup tabulka rozhodne hluboko pod milisekundou a na jeden ticket nestojí nic. Agent, který udělá šest volání modelu, stojí šest volání a odpoví za pár sekund. Pro toho, kdo o to požádal, je obojí „AI triage“, a ty jsi ten, kdo musí říct, co omezení dovolí.',
        },
        {
          caption: 'Čtyři příčky seřazené podle toho, jak velkou část rozhodnutí předáváš z ruky.',
          headers: ['Příčka', 'Kdo rozhoduje, co se stane', 'Co stojí jeden ticket', 'Kde přestane fungovat'],
          rows: [
            [
              'Deterministický kód',
              'Ty, dopředu. Stejný vstup dá při každém běhu stejný výstup.',
              'Procesor, na kterém běží, a zlomek milisekundy.',
              'Ve vstupu není nic, podle čeho se větvit, nebo pravidel přibývá rychleji, než je kdokoli stíhá udržovat.',
            ],
            [
              'Jedno volání modelu',
              'Krok vybíráš ty, odpověď uvnitř něj vybírá model.',
              'Jedno volání: jeho tokeny, jeho latence a špatná odpověď s četností, kterou musíš změřit.',
              'Rozhodnutí potřebuje informaci, kterou prompt neobsahuje, nebo druhé rozhodnutí závislé na tom prvním.',
            ],
            [
              'Workflow',
              'Kroky a jejich pořadí určuješ ty, model doplní jeden nebo dva z nich.',
              'Jedno volání na každý krok s modelem. Latence je jejich součet a znáš ji dřív, než nasadíš.',
              'Kroky se opravdu nedají zafixovat, dokud neuvidíš, co vrátil ten předchozí.',
            ],
            [
              'Agent',
              'Model, za běhu: který nástroj zavolat, kolikrát a kdy skončit.',
              'Nepředvídatelný počet volání uvnitř rozpočtu, který nastavíš.',
              'Špatný krok má následky, které nevrátíš zpátky, nebo někomu dlužíš latenci na jeden požadavek.',
            ],
          ],
        },
        {
          body:
            'Začni odspodu a nech si od někoho vyargumentovat, proč jít výš. Scénářová čísla Marlbrooku říkají, že 71 ze 100 ticketů přijde přes zákaznický portál, kde si zákazník sám vybral jednu ze čtyř kategorií. Tým podpory ručně oštítkoval 300 takových portálových ticketů frontou, ve které nakonec skončily, a třípoložková lookup tabulka nad vybranou kategorií se s tou frontou shodla 268krát. Těch 32 chyb mělo většinou jeden tvar: naštvaný zákazník klikne na „Ostatní“.',
        },
        { caption: 'Příčka, kterou většina návrhů přeskočí: tři položky a explicitní východ pro všechno ostatní.' },
        {
          body:
            'Přidat model není sám o sobě krok nahoru. Přidává cenu na ticket, síťový round trip uvnitř tvého latenčního rozpočtu, závislost s vlastní dostupností a poruchu, kterou pravidlo nemělo: odpověď, která je špatně a nedává na sobě znát žádnou pochybnost. Když pravidlo už teď plní přesnost, kterou zákazník chtěl, výměna za volání modelu udělá systém pomalejší, dražší a hůř vysvětlitelný výměnou za nic.',
        },
        {
          body:
            'Zbývá zbylých 29 ticketů ze sta. Přicházejí e-mailem jako volný text bez jakékoli kategorie a žádná tabulka, kterou bys napsal, je nepřečte. Právě tady si jedno volání modelu zaslouží místo: jedno rozhodnutí, malá uzavřená množina odpovědí, operátor, který zkontroluje všechno nejisté, a žádný krok závislý na kroku předchozím.',
        },
        {
          caption: 'Model uvidí jen tickety, které pravidlo nerozhodlo, a každá cesta kromě ověřené sebejisté odpovědi končí u člověka.',
        },
        {
          body:
            'Workflow je další příčka: kroky i jejich pořadí pořád píšeš ty a model doplní jeden nebo dva z nich. Marlbrookův návrh odpovědi je přesně to: přečti ticket, dohledej zákaznický záznam, vytáhni tři články z knowledge base, jedním voláním modelu z nich naskládej návrh odpovědi, deterministicky zkontroluj, že každé tvrzení v návrhu cituje jeden z těch tří článků, a polož to operátorovi na stůl. Pět kroků, jedno volání modelu a latence, kterou si sečteš na papíře dřív, než to postavíš.',
        },
        {
          body:
            'Agent přesouvá do modelu i to pořadí. Dáš mu nástroje a cíl a on rozhoduje, který nástroj zavolat, co s výsledkem udělat a jestli půjde na další kolo. Tu posloupnost nikdo dopředu nenapíše, což je celý smysl a zároveň celý účet: dopředu neřekneš, kolik volání jeden ticket spotřebuje.',
        },
        {
          caption: 'Jeden ticket agentskou smyčkou s rozpočtem pěti volání. Každý snímek ukazuje všechny dosud udělané kroky.',
          notes: [
            'Volání jedna: model přečte ticket a rozhodne, že bez knowledge base nemá co klasifikovat.',
            'Volání dvě: prohledá knowledge base na „export fails“ a dostane tři články, ani jeden o nočním exportu.',
            'Volání tři: s těmi výsledky není spokojený a hledá znovu jinými slovy. Pevné workflow by po jednom hledání skončilo; agent se rozhodl utratit další volání.',
            'Volání čtyři: přečte zákaznický záznam a ověří tarif, protože jeden z článků platí jen pro enterprise tier.',
            'Volání pět: navrhne inženýrskou frontu. To je odpověď a dorazila při posledním volání, které rozpočet dovolil.',
            'Rozpočet je vyčerpaný, takže smyčka končí bez ohledu na to, jestli byla hotová. Pět volání na jeden ticket, který by portálový formulář zařadil zdarma, a další ticket může stát dvě volání, nebo narazit do rozpočtu bez jediného výsledku.',
          ],
          counterLabels: ['Volání modelu', 'Volání modelu', 'Volání modelu', 'Volání modelu', 'Volání modelu', 'Volání modelu'],
        },
        {
          caption: 'Přečti si nejdřív omezení a teprve pak se podívej, které příčky po něm zůstanou stát.',
          headers: ['Omezení, které jsi dostal', 'Co vylučuje', 'Co obvykle zbude'],
          rows: [
            [
              'p95 pod 300 ms uvnitř požadavku, na který zákazník čeká',
              'Agenta, a i volání modelu, pokud se do toho rozpočtu poskytovatel nevejde i s prostorem na opakování',
              'Pravidlo hned teď a těžké tickety ve frontě na člověka',
            ],
            [
              'Každé rozhodnutí o zařazení musí být za rok vysvětlitelné auditorovi',
              'Každou příčku, jejíž výstup nezreprodukuješ z toho, co sis uložil',
              'Pravidlo, nebo jedno volání modelu, u kterého si necháš vstup, výstup, verzi i důvod z validace',
            ],
            [
              'Pod jeden cent na ticket při 40 000 ticketech měsíčně',
              'Smyčku, která na jeden ticket udělá neomezený počet volání',
              'Pravidlo na tvary, které mají strukturu, a jedno volání na zbytek',
            ],
            [
              'Které dohledání přijde na řadu, závisí na tom, co vrátilo to předchozí',
              'Pevné workflow, pokud je ta závislost skutečná a ne jen nepořádek v kódu',
              'Agenta s rozpočtem kroků, allowlistem nástrojů a člověkem, který schvaluje cokoli, co koná',
            ],
          ],
        },
        {
          body:
            'Všechna čísla v tomto modulu jsou napsaná pro scénář. Marlbrook neexistuje, vzorek 268 z 300 je vymyšlený pro tuhle lekci a odpovědi modelu, které budeš ve cvičení ověřovat, jsou fixture řetězce, ne nahraný výstup poskytovatele. Na skutečné zakázce by sis deterministickou baseline změřil sám dřív, než utratíš cokoli za příčku nad ní, a kvalitu bys reportoval odděleně od ceny, latence a od toho, jak často se systém odpovědi zdržel.',
        },
        {
          body:
            'Po žebříku se leze i dolů. Když evaluace ukáže, že workflow porazí agenta v přesnosti a stojí pětinu, je posun o příčku níž výsledek, ne ústup. Rozhodnout, že zákazníkův problém vyřeší lookup tabulka a fronta na operátora, je legitimní odpověď na otázku architektury, a u triage systému je to velmi často odpověď správná.',
        },
      ],
    },
    'fde-v1-m04-l2': {
      title: 'Strukturované výstupy a jak selhávají',
      summary:
        'Když si od modelu vyžádáš JSON, dostaneš proud tokenů, který obvykle vypadá jako JSON. Co musí hranice zkontrolovat, co JSON schéma neslibuje a co dělat, když kontrola neprojde.',
      sections: [
        {
          body:
            'Tvůj prompt končí větou „Odpověz jenom JSONem.“ Zpátky přijde proud tokenů, který obvykle vypadá jako JSON. Většinou ho `JSON.parse` spolkne a ty na tu větu už nikdy nepomyslíš. Ve zbytku případů spadne uprostřed cyklu ve dvě ráno, nebo hůř, projde čistě a podá ti confidence 1.4.',
        },
        { caption: 'Jedna fixture odpověď. JSON je správně a `JSON.parse` nad celým řetězcem spadne hned na prvním znaku.' },
        {
          body:
            'Tak nejdřív vytáhni, pak parsuj. Vezmi první `{` a poslední `}` a naparsuj, co je mezi nimi: to přežije úvodní větu, markdown fence i závěrečnou zdvořilost, což pokrývá většinu toho, jak zabalení vypadá. Je to heuristika a má očividnou díru: dva objekty v jedné odpovědi a dostaneš rozsah od prvního k poslednímu, který se nenaparsuje jako nic. Napiš tu heuristiku v kódu naplno a počítej, jak často se spustí, ať poznáš, že se modelu změnily zvyky.',
        },
        {
          caption: 'Šest způsobů, jak triage odpověď selže, a co s každým udělá holý `JSON.parse(raw)`.',
          headers: ['Selhání', 'Co dorazí', 'Co udělá holý parse'],
          rows: [
            ['Zabalené v próze', 'Věta, blok ve fence, další věta', 'Spadne na prvním znaku a ticket vypadne z dávky'],
            [
              'Uříznuté na token limitu',
              '`{"ticketId": "TCK-1007", "evidence": {"quote": "…"}, "confid`',
              'Spadne. Částečně platné JSON neexistuje, jen neplatné.',
            ],
            [
              'Chybějící pole',
              '`{"ticketId": "TCK-1009", "confidence": 0.7}`',
              'Naparsuje se. `decision.category` je `undefined` a ticket skončí ve frontě jménem `undefined`.',
            ],
            [
              'Špatný typ',
              '`{"confidence": "0.82"}`',
              'Naparsuje se. `"0.82" < 0.6` je false, takže řetězec proklouzne prahem na confidence.',
            ],
            [
              'Mimo rozsah nebo mimo enum',
              '`{"confidence": 1.4}` nebo `{"category": "escalate"}`',
              'Naparsuje se. Každé následné porovnání projde a ticket jde do fronty, kterou nikdo neobsluhuje.',
            ],
            [
              'Sebejistá špatná hodnota',
              '`{"ticketId": "TCK-1004", "category": "billing", "confidence": 0.94}` u hlášení chyby',
              'Naparsuje se, projde validací a je špatně. Tohle žádná kontrola na hranici nevidí.',
            ],
          ],
        },
        {
          body:
            'Silnější prompt to nespraví. „Odpověz jenom JSONem, bez vysvětlení“ sníží četnost zabalených odpovědí; ten případ neodstraní a četnost není záruka. Dekódování svázané JSON schématem je skutečné zlepšení a přesto užší, než si lidé myslí: svazuje tvar odpovědi, která doběhne, ne pravdivost hodnot, a odpověď uříznutá na token limitu není částečně platná, je nenaparsovatelná. Kontrola patří do kódu, na každou odpověď, ať prompt říká cokoli.',
        },
        {
          body:
            'Dej ji do jedné funkce, stejně jako M02 dal kontrolu integrace do jedné funkce. Dovnitř jde to, co dorazilo; ven jde buď rozhodnutí, na které se zbytek kódu může spolehnout, nebo důvod, proč nemůže. Nic dál po proudu už nic nekontroluje a nic dál po proudu nečte surovou odpověď.',
        },
        { caption: 'První půlka hranice: ohlídej typ, vytáhni, naparsuj a každé selhání pojmenuj.' },
        {
          body:
            'Všimni si, že každý východ je hodnota z pevného seznamu, ne vyhozená výjimka nebo volný text. Uzavřený slovník je to, co dělá selhání spočitatelnými: můžeš vykreslit `unparsable-json` po hodinách, spustit alert, když po změně verze modelu vyskočí `confidence-out-of-range`, a každý důvod poslat do jiného fallbacku. Volnotextové důvody ti dají log, který nikdo neagreguje.',
        },
        {
          caption: 'Tři odpovědi na neúspěšnou validaci a co každá stojí.',
          headers: ['Odpověď', 'Kdy se hodí', 'Co stojí'],
          rows: [
            [
              'Zdržet se odpovědi',
              'Rozhodnutí má následky, fronta na operátora existuje a „nejsem si jistý“ je přijatelná odpověď',
              'Čas operátora a míru zdržení, kterou musíš reportovat vedle přesnosti, ne uvnitř ní',
            ],
            [
              'Zopakovat jednou',
              'Selhání vypadá přechodně: uříznutí, zabalená odpověď, chyba parsování, ne špatná hodnota',
              'Druhé volání a druhou porci latence na ticketu, který svůj rozpočet už utratil',
            ],
            [
              'Spadnout zpátky na deterministické pravidlo',
              'Pravidlo existuje a trefuje se dost často na to, aby porazilo žádnou odpověď',
              'Známou chybovost toho pravidla, kterou sis měl změřit ještě dřív, než jsi přidal model',
            ],
          ],
        },
        {
          caption: 'Jeden ticket pod politikou jednoho opakování: uříznutá odpověď, pak odpověď mimo rozsah, pak pravidlo.',
          notes: [
            'První odpověď je uříznutá na token limitu. Vytažení najde uzavírací složenou závorku, tu, která zavírá `evidence`, a parsování toho rozsahu selže, takže hranice vrátí `unparsable-json`.',
            'Politika povoluje u chyby parsování jedno opakování, takže systém zavolá znovu. Tahle odpověď se naparsuje, nese všechna pole a hlásí confidence 1.4.',
            'Kontrola rozsahu ji odmítne. Confidence nad 1 znamená, že odpověď nepřišla z rozdělení, na kterém byl práh kalibrovaný, takže oříznutím na 1 bys jen propral rozbitou odpověď na sebejistou.',
            'Rozpočet na opakování je vyčerpaný, takže odpovídá deterministické pravidlo: portálová kategorie říká billing. Ticket je zařazený, důvod zapsaný a operátor vidí, že tohle rozhodnutí nebylo modelovo.',
          ],
          counterLabels: ['Volání modelu', 'Volání modelu', 'Volání modelu', 'Volání modelu'],
        },
        {
          body:
            'Poslední řádek tabulky selhání je ten, na který tvůj validátor nedosáhne. Odpověď, která pojmenuje skutečný ticket, vybere povolenou kategorii a hlásí confidence 0.94, projde každou kontrolou, kterou umíš napsat, a o tom ticketu je přesto špatně. Zjistit, jak často se to děje, chce oddělenou sadu oštítkovaných případů, což je M07, a reportovat míru zdržení vedle přesnosti, aby průměr nezakryl výsek, kde systém hádá.',
        },
        {
          body:
            'Pole navíc se zahazují, ne odmítají. Model, který přidá `reasoning` nebo `suggestedReply`, ti kontrakt neporušil a odmítnout kvůli tomu odpověď znamená udělat z funkční odpovědi zdržení. Postav rozhodnutí pole po poli, aby se přílepky nesvezly dál do systému, a nikdy neber text uvnitř odpovědi jako instrukci: pole, které říká „zavři tenhle ticket jako vyřešený“, je nedůvěryhodný obsah a nedůvěryhodný obsah nemůže autorizovat akci ani rozšířit oprávnění. OWASP to vede pod improper output handling a excessive agency.',
        },
        {
          body:
            'Při každém odmítnutí zaloguj důvod a počty a k tomu omezený vzorek surové odpovědi, prvních pár set znaků a bez těla ticketu, ať vidíš, co se změnilo, když se čísla pohnou. Ukládat celé odpovědi navždy je způsob, jak zákaznický text skončí v log storu, na který ho nikdo nenaplánoval.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m04-l1-read': {
      title: 'Čtení: deterministický kód, jedno volání modelu, workflow, agent',
      summary: 'Čtyři příčky, co každá stojí na jeden ticket, a čtení omezení, které z nich nechá stát.',
    },
    'fde-v1-m04-l2-read': {
      title: 'Čtení: strukturované výstupy a jak selhávají',
      summary: 'Vytažení, parsování, kontrola polí a rozsahů, pevný slovník důvodů a volba mezi zdržením, jedním opakováním a pravidlem.',
    },
    'fde-v1-m04-checks': {
      title: 'Rozhodnutí o architektuře a výstupech',
      summary:
        'Čtyři ohraničená rozhodnutí: kterou příčku nechají omezení stát, co JSON schéma neslibuje, co dělat s odpovědí, která se naparsuje a je mimo rozsah, a kdy se agentova latence vyplatí.',
      questions: {
        'fde-v1-m04-q1': {
          prompt:
            'Marlbrook chce zařazovat portálové tickety, dokud je zákazník ještě na potvrzovací obrazovce: p95 pod 300 ms a zařazení musí být vysvětlitelné auditorovi. Každý portálový ticket nese kategorii, kterou si zákazník vybral ze čtyř možností, a na ručně oštítkovaném vzorku 300 ticketů se třípoložková lookup tabulka shodla s finální frontou operátora 268krát. Těch 32 chyb byli skoro výhradně zákazníci, kteří klikli na „Ostatní“. Který návrh postavíš jako první?',
          options: [
            'Lookup tabulku, se vším, co nerozhodne, včetně každého „Ostatní“, poslaným do fronty na operátora, a s chybovostí změřenou znovu po týdnu.',
            'Jedno volání modelu na každý portálový ticket, protože model přečte tělo ticketu a lookup tabulka čte jen rozbalovací seznam.',
            'Workflow, které nejdřív zavolá lookup tabulku a pak vždycky ještě modelem ověří, co tabulka rozhodla.',
            'Agenta s nástrojem nad knowledge base, aby se špatně zařazené tickety prošetřily dřív, než někoho vyrušíme.',
          ],
          explanation:
            'Vybírají tady omezení. p95 300 ms uvnitř živého požadavku nenechává skoro žádný prostor na round trip k poskytovateli plus opakování, a „vysvětlitelné za rok“ máš u lookup tabulky zdarma a u čehokoli jiného za práci navíc. Tabulka se s operátorem shodne na 268 z 300 a její chyby se koncentrují do jednoho koše, který můžeš jmenovitě poslat člověku. Volat model na každý ticket znamená utrácet peníze a latenci na těch 71 %, které rozbalovací seznam už zodpověděl, a přinést sebejistě špatnou odpověď tam, kde žádná nebyla. Ověřovat tabulku modelem je stejná cena s horší poruchou: potřebuješ navíc pravidlo, kdo vyhrává při neshodě, a model nemá víc informací, než měl ten seznam. Agent padá rovnou na latenci a prošetřit špatné zařazení je práce pro frontu operátora, ne pro cestu požadavku. Kterákoli z vyšších příček může být správně na těch 29 % ticketů, které chodí e-mailem jako volný text: jiné omezení, jiné rozhodnutí.',
        },
        'fde-v1-m04-q2': {
          prompt:
            'Poskytovatel Marlbrooku umí svázat odpověď JSON schématem: `ticketId` a `category` jsou povinné řetězce, `category` je enum ze čtyř hodnot a `confidence` je číslo. Předpokládej, že odpověď doběhne a nenarazí na token limit. Co ti to svázání pořád nedá?',
          options: [
            'Že je rozhodnutí správné. Odpověď může splnit každou vlastnost a přesto pojmenovat ticket zavřený minulý týden, označit hlášení chyby za `billing` a hlásit u toho 0.94.',
            'Že `category` je jedna ze čtyř hodnot, protože enum je součást schématu.',
            'Že `confidence` dorazí jako číslo, a ne jako řetězec `"0.82"`.',
            'Že jsou v odpovědi obě povinné vlastnosti přítomné.',
          ],
          explanation:
            'Schéma svazuje tvar a tvar není pravda. Nic v enumu nezabrání modelu vybrat z něj špatnou hodnotu a nic v číselném typu nezabrání tomu, aby 0.94 bylo o tom ticketu sebejistě špatně. Zbylé tři možnosti jsou přesně to, co ti svázání u doběhlé odpovědi koupí, proto ta otázka ten předpoklad fixuje a proto tvůj kód pořád parsuje obezřetně: odpověď uříznutá na token limitu není částečně platný objekt s chybějící vlastností, je to text, který se nenaparsuje vůbec, a hranice to hlásí jako chybu parsování, ne jako chybějící pole. Kontrolovat hodnoty, které ti někdo slíbil, je levné; vynechat kontrolu proto, že to schéma slíbilo, je způsob, jak se do routeru dostane neexistující jméno fronty.',
        },
        'fde-v1-m04-q3': {
          prompt:
            'Triage odpověď se čistě naparsuje, pojmenuje skutečný ticket i povolenou kategorii a hlásí `"confidence": 1.4`. Tvůj práh pro přijetí je 0.6. Co má hranice udělat?',
          options: [
            'Odmítnout ji s uvedeným důvodem, odmítnutí započítat a jít cestou, kterou určuje politika: zdržet se ve prospěch operátora, jednou zopakovat, nebo použít deterministické pravidlo.',
            'Oříznout hodnotu na 1.0 a přijmout ji, protože kategorie bude nejspíš stejně správně a 1.4 zjevně znamená, že si byl model jistý.',
            'Přijmout ji tak, jak je, protože 1.4 je nad prahem 0.6 a od toho ten práh je.',
            'Opakovat volání, dokud nedorazí odpověď s confidence uvnitř rozsahu.',
          ],
          explanation:
            'Confidence nad 1 je důkaz, že tahle odpověď nepřišla z rozdělení, na kterém byl tvůj práh kalibrovaný, takže každý závěr, který bys z toho čísla vyvodil, je nebezpečný, včetně závěru, že kategorie vedle něj je v pořádku. Oříznutí na 1.0 to nespraví; propere rozbitou odpověď na tu nejsebejistější, jakou tvůj systém umí vyjádřit, a zničí signál, podle kterého bys poznal změnu modelu. Přijmout ji, protože překročila práh, je tatáž chyba o krok dřív: porovnání dává smysl jen pro hodnoty uvnitř rozsahu, který kontrola definuje. Opakovat, dokud odpověď nebude v rozsahu, je neomezená práce hnaná selháním, u kterého nemáš důvod věřit, že je přechodné, a spálí latenční rozpočet ticketu, který ho už utratil. Odmítni, pojmenuj důvod z pevného slovníku, ať jde spočítat, a co bude dál, ať rozhodne politika.',
        },
        'fde-v1-m04-q4': {
          prompt: 'Agentská smyčka přidá sekundy latence a nepředvídatelný počet volání modelu na jeden požadavek. Kdy se to vyplatí zaplatit?',
          options: [
            'Když se kroky opravdu nedají zafixovat dopředu, protože každé dohledání závisí na tom, co vrátilo předchozí, smyčka má rozpočet kroků a člověk schvaluje všechno, co koná.',
            'Když má úloha víc než zhruba pět kroků, protože smyčka se udržuje líp než řetěz volání.',
            'Když je přesnost důležitější než latence, protože agent si svou práci před odpovědí sám překontroluje.',
            'Když je model dost dobrý na to, aby ho pevné workflow zbytečně svazovalo.',
          ],
          explanation:
            'Agent ti kupuje jedinou věc: posloupnost vybranou za běhu. Ta stojí za svou cenu jen tehdy, když je opravdu dopředu nezjistitelná, a jen uvnitř mantinelů: rozpočtu kroků, aby jeden ticket nespolkl hodinu, a schvalovacího kroku, aby špatné rozhodnutí nezačalo konat dřív, než ho uvidí člověk. Test to není počet kroků; patnáctikrokové workflow, které nakreslíš na tabuli, je pořád workflow a přepsat ho na smyčku vymění předvídatelnou latenci za nepředvídatelnou. Agent, který si čte vlastní výstup, není mechanismus správnosti, protože kontroluje tentýž model, který se spletl, a čím víc volání, tím větší šance, že se špatný mezikrok potáhne dál. Poslední možnost vybírá návrh podle technologie místo podle omezení, a přesně tak skončí systém, který měl odpovědět do 300 ms, na šesti sekundách.',
        },
      },
    },
    'fde-v1-m04-structured-output-validator': {
      title: 'Hranice kolem odpovědi modelu',
      summary:
        'Udělej ze surové triage odpovědi rozhodnutí, nebo pojmenovaný důvod: vytáhni ji z prózy, naparsuj, zkontroluj pole, zkontroluj rozsahy a pole navíc zahoď místo toho, abys kvůli nim odpověď odmítl.',
      code: {
        prompt:
          'Napiš funkci `validateTriage(raw)`. Bere to, co se vrátilo z triage promptu, a vrací buď `{ ok: true, decision }`, nebo `{ ok: false, reason }`. Nikdy nevyhodí výjimku, ať jí předáš cokoli.\n\nRozhodnutí je přesně `{ ticketId, category, confidence }` a nic víc. `category` je jedna z hodnot `billing`, `bug`, `how-to`, `other`. `confidence` je číslo od 0 do 1 včetně obou konců.\n\n`reason` je z tohoto slovníku a z žádného jiného: `not-a-string`, `no-json-object`, `unparsable-json`, `missing-field`, `wrong-type`, `unknown-category`, `confidence-out-of-range`.\n\nKontroly dělej v tomto pořadí a vrať první selhání:\n\n1. **Není to řetězec.** `raw` je cokoli jiného než řetězec, tedy `null`, `undefined`, číslo nebo už naparsovaný objekt: `not-a-string`.\n2. **Vytažení.** Vezmi rozsah od prvního `{` po poslední `}`. Žádné `{`, nebo poslední `}` je před tím prvním `{`: `no-json-object`. Tohle je ta heuristika, která přežije úvodní prózu i markdown fence.\n3. **Parsování.** `JSON.parse` nad tím rozsahem vyhodí výjimku: `unparsable-json`. Sem spadne odpověď uříznutá na token limitu.\n4. **`ticketId`.** Chybí nebo je `null`: `missing-field`. Je tam, ale není to řetězec: `wrong-type`. Řetězec, který je po oříznutí prázdný: `missing-field`.\n5. **`category`.** Chybí nebo je `null`: `missing-field`. Není to řetězec: `wrong-type`. Po oříznutí prázdný: `missing-field`. Po oříznutí to není jedna ze čtyř povolených hodnot, porovnáno přesně, takže `Billing` se s `billing` neshoduje: `unknown-category`.\n6. **`confidence`.** Chybí nebo je `null`: `missing-field`. Není to konečné číslo, včetně řetězce `"0.82"`: `wrong-type`. Pod 0 nebo nad 1: `confidence-out-of-range`.\n\nPři úspěchu vrať oříznuté `ticketId`, oříznutou `category` a `confidence` tak, jak dorazila. Ten objekt stav pole po poli: odpověď, která nese `reasoning`, `suggestedReply` nebo cokoli dalšího, je platná a tahle pole se do tvého rozhodnutí dostat nesmí.\n\nText uvnitř odpovědi jsou data, nikdy ne instrukce. Jedna fixture nese `operatorNote`, které ti říká, ať ticket zavřeš; tvůj kód ho zahodí jako každé jiné pole navíc.\n\nOdpovědi v `__RAW` jsou fixtures napsané pro toto cvičení, ne nahraný výstup poskytovatele. Nic tady nevolá model ani neotevírá síťové spojení.',
        contract: [
          'Pro každý vstup vrať objekt s výsledkem. Žádný vstup nesmí vyhodit výjimku, ani `null`, `undefined`, číslo nebo už naparsovaný objekt.',
          '`reason` je jedna ze sedmi vyjmenovaných hodnot. Nevymýšlej si vlastní důvod a nevracej volný text.',
          'Vytažený rozsah parsuj přes `JSON.parse` uvnitř `try`. Netahej pole ven regulárním výrazem.',
          'Rozhodnutí stav vlastnost po vlastnosti. Naparsovaný objekt nerozbaluj spreadem ani nekopíruj.',
          '`__RAW` dodává harness úlohy. Čti z něj, nepředefinovávej ho.',
        ],
        hints: [
          'Nejdřív ohlídej typ. `typeof raw !== \'string\'` musí být dřív než jakákoli řetězcová metoda, jinak první vstup, který není řetězec, spadne uvnitř tvého validátoru místo toho, aby vrátil důvod.',
          '`raw.indexOf(\'{\')` a `raw.lastIndexOf(\'}\')` ti dají ten rozsah. `raw.slice(start, end + 1)` uzavírací závorku zahrne; zapomenuté `+ 1` udělá z každé platné odpovědi `unparsable-json`.',
          'Každé pole má tytéž tři otázky ve stejném pořadí: je tam, má správný typ, je hodnota použitelná. Na tu prostřední odpoví u `confidence` funkce `Number.isFinite`, a pro řetězec `"0.82"` vrátí false, aniž bys typ testoval zvlášť.',
        ],
        approach: [
          'Vrať `not-a-string`, pokud neplatí `typeof raw === \'string\'`, aby nic pod tím nemohlo na jiném vstupu spadnout.',
          'Najdi první `{` a poslední `}`. Vrať `no-json-object`, když `{` není, nebo když poslední `}` leží před ním.',
          'Naparsuj `raw.slice(start, end + 1)` uvnitř `try` a z `catch` vrať `unparsable-json`.',
          'Zkontroluj `ticketId`, pak `category`, pak `confidence`, každé na přítomnost, pak typ, pak hodnotu, a vrať první selhání, na které narazíš.',
          'Slož `{ ticketId, category, confidence }` pole po poli z oříznutých hodnot a vrať to uvnitř `{ ok: true, decision }`.',
        ],
        criteria: [
          {
            label: 'Správná rozhodnutí a správné důvody',
            detail:
              'Odpověď prošla, ačkoli měla být odmítnutá, byla odmítnutá se špatným důvodem, nebo prošla se špatným rozhodnutím. Zkontroluj pořadí kontrol, že `slice` zahrnuje uzavírací závorku, že `ticketId` i `category` jsou v rozhodnutí oříznuté a že rozhodnutí nese ta tři pole a nic dalšího.',
          },
          {
            label: 'Žádný vstup nespadne',
            detail:
              'Nějaký vstup unikl jako výjimka místo objektu s výsledkem. Obvyklé příčiny jsou řetězcová metoda volaná dřív než kontrola `typeof` a `JSON.parse` mimo `try`. Každý vstup, včetně `null`, `undefined`, čísla a už naparsovaného objektu, se musí vrátit jako `{ ok: false, reason }`.',
          },
          {
            label: 'Hodnoty mimo rozsah a mimo enum se odmítají',
            detail:
              'Hodnota, která se naparsuje, není totéž co hodnota, kterou můžeš použít. Confidence mimo 0 až 1 i kategorie mimo čtyři povolené hodnoty se musí odmítnout s vlastním důvodem, ne oříznout, ne převést na malá písmena do shody a ne pustit dál jen proto, že tvar seděl.',
          },
        ],
        testLabels: [
          'čistá odpověď se změní v rozhodnutí',
          'próza a markdown fence kolem JSONu se odloupnou',
          'odpověď uříznutá na token limitu je chyba parsování',
          'odmítnutí napsané prózou nenese žádné JSON',
          'confidence 1.4 se naparsuje a přesto se odmítne',
          'kategorie mimo čtyři fronty se odmítne',
          'null tam, kde měl být řetězec, je chybějící pole',
          'pole navíc se zahodí, odpověď se neodmítne',
          'vstup, který není řetězec, vrátí důvod místo výjimky',
        ],
      },
    },
  },
};
