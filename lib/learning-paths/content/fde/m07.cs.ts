/** Czech copy for FDE M07. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English.
 *
 * Kept in English because a Czech developer keeps them: baseline, slice
 * (glossed once as „řez“), held-out (glossed once as „odložená sada“),
 * coverage, p95, tenant, rollback, and every identifier in the report. */

import type { ModuleCs } from '../../types';

export const FDE_M07_CS: ModuleCs = {
  title: 'Vyhodnocování',
  outcomes: [
    'Postavit označkovanou sadu ze skutečných selhání, dát každému případu značku řezu (slice) a odložit polovinu stranou jednou, ještě než začne jakékoli ladění.',
    'Pojmenovat tři způsoby, jak se odpověď z odložené sady dostane zpátky do systému, který má měřit, a říct, co každý z nich nafoukne.',
    'Reportovat přesnost, pokrytí, cenu a p95 latenci jako čtyři čísla a říct, které z nich odpovídá na otázku, kterou zákazník opravdu položil.',
    'Přečíst tabulku po řezech a najít řez, který rostoucí souhrnné číslo zakrývá.',
    'Napsat pravidlo, které rozhodne o vítězi, dřív než porovnání spustíš, a měřit deterministickou baseline stejně jako všechno ostatní.',
  ],
  lessons: {
    'fde-v1-m07-l1': {
      title: 'Referenční případy a únik dat',
      summary:
        'Odkud se berou označkované případy, co musí jeden záznam nést, proč se odložená polovina odděluje dřív, než začneš cokoli ladit, a tři tiché způsoby, jak se z ní odpověď dostane zpátky.',
      sections: [
        {
          body:
            'Support workbench v Marlbrooku přečte příchozí ticket a navrhne pro něj frontu. Většinou to trefí — a právě to „většinou“ je celý problém: nikdo v místnosti neumí říct, jestli změna z minulého týdne pomohla, uškodila, nebo jen přesunula selhání někam, kde nejsou vidět. Rozhodne to sada ticketů se správnou frontou zapsanou dřív, než je systém uvidí.',
        },
        {
          body:
            'Nejlevnější zdroj dobrých případů je tvůj vlastní seznam defektů. Každý ticket, který operátor přesměroval ručně, je případ, kde už někdo rozhodl, jaká byla správná odpověď. Vytáhni jich třicet, nech původní text a máš sadu, která padá ze stejných důvodů, z jakých padá tvůj systém — ne z těch, které sis představoval u tabule.',
        },
        { caption: 'Jeden případ. `expected` je jediné pole, které hodnocení porovnává; zbytek existuje proto, aby se o značce dalo později přít.' },
        {
          body:
            'Použitelný případ má čtyři vlastnosti. Má právě jednu správnou odpověď, na které se shodnou dva operátoři. Nese značku řezu, takže se můžeš ptát, jak si systém vede na reklamačních ticketech, a ne jen jak si vede celkově. Má zapsáno, kdo ho označkoval a kdy, protože značka je úsudek a úsudky se revidují. A drží vstup tak, jak dorazil, včetně překlepů, protože vyčištěný vstup dělá z případu test systému, který nikdo neprovozuje.',
        },
        {
          body:
            'Každý případ, predikce, přesnost i latence v tomto modulu jsou vymyšlená fixture data napevno na hodnotě, kterou vidíš. Nic tady nevolá model. Živý model se na tutéž otázku umí zeptaný dvakrát rozhodnout dvakrát jinak; celý smysl fixture je, že to nedělá — díky tomu se dá cvičení hodnotit a proto je zároveň slabou napodobeninou provozu.',
        },
        {
          body:
            'Sadu rozděl na dvě poloviny dřív, než na cokoli sáhneš. Jedna je na experimenty: měň prompt, posunuj hranici jistoty, vyměň router, koukej na číslo. Druhá — odložená sada (anglicky held-out) — zůstane zavřená. Losování nasaď seedem, ať stejné tickety padnou do stejné poloviny pokaždé, když soubor přegeneruješ, a rozdělení commitni do repozitáře místo opakovaného losování. Dokumentace Pythonu k modulu `random` popisuje obě půlky toho zvyku: `random.sample` pro výběr bez opakování a nasazený `Random` pro výběr, který jde zopakovat.',
        },
        {
          caption: 'Čtyři ladicí kola na vývojové polovině, jeden běh proti odložené sadě a běh, který ji zničí.',
          notes: [
            'Těch 36 případů se rozdělí jednou, 24 na experimenty a 12 stranou, a rozdělení se zapíše. První hranice je odhad a vývojová polovina dá 0,71. Odložená sada zatím neběžela.',
            'Zvýšení hranice na 0,60 posune vývojovou polovinu na 0,78. Přesně k tomu vývojová polovina je a odložená sada pořád neběžela.',
            '0,68 dosáhne na vývojové polovině 0,83. Každé kolo vybere hodnotu, která těmhle konkrétním 24 ticketům sedí o kousek líp než ta předchozí.',
            'Čtvrté kolo se usadí na 0,71 a 0,85. V tom čísle jsou čtyři kola dolaďování a každé z nich vidělo tytéž 24 tickety.',
            'Odložená sada proběhne jednou, na hranici vybrané vývojovou polovinou, a dá 0,74. To je číslo, které reportuješ. Rozdíl proti 0,85 je to, co si čtyři kola ladění vydělala na případech, které už znala.',
            'Někdo posune hranici na 0,76, protože to zvedne skóre na odložené sadě na 0,79. Odložená sada tím právě rozhodla o nastavení, takže je z ní druhá vývojová polovina, 0,79 neměří nic odloženého a žádné čisté číslo k reportování nezbylo.',
          ],
          counterLabels: [
            'Běhů odložené sady',
            'Běhů odložené sady',
            'Běhů odložené sady',
            'Běhů odložené sady',
            'Běhů odložené sady',
            'Běhů odložené sady',
          ],
        },
        {
          body:
            'Poslední snímek je únik dat (anglicky leakage) a stojí za to si zapamatovat jeho definici: odpovědi z odložené sady ovlivnily to, co měly změřit. Nikdy se neohlásí. Nikdo neopisuje klíč s odpověďmi do kódu. Někdo pustí odloženou sadu podruhé nebo znovu použije případ, který kdysi vložil do promptu, a číslo stoupne, i když se systém nezměnil.',
        },
        {
          caption: 'Tři tiché úniky, co každý z nich nafoukne a jak to spravit.',
          headers: ['Jak k tomu dojde', 'Co to nafoukne', 'Co s tím'],
          rows: [
            [
              'Po každé změně pustíš odloženou sadu a necháš si variantu, která skórovala nejlíp',
              'Číslo na odložené sadě, a to o tolik, o kolik tvoje volby přilnuly k těmhle konkrétním případům. Čím víc variant jsi vyzkoušel, tím větší nadhodnocení',
              'Laď jen na vývojové polovině. Odloženou sadu pouštěj jednou na jedno rozhodnutí a zapisuj si, kolikrát už běžela',
            ],
            [
              'Few-shot příklady v promptu jsou opsané z vyhodnocovací sady',
              'Přesnost přesně na těch případech, protože systém dostal svůj vlastní klíč s odpověďmi',
              'Každý případ použitý jako příklad přesuň natrvalo do vývojové poloviny. Příklad je učební materiál, ne test',
            ],
            [
              'Týž generátor vyrobil fixture data, proti kterým se systém stavěl, i případy, na kterých se měří',
              'Všechno, a neviditelně. Sada sdílí slovník generátoru, jeho krajní případy i jeho slepá místa',
              'Případy do odložené sady ber z reálného provozu. Generované případy nech ve vývojové polovině a označ je v souboru jako generované',
            ],
          ],
        },
        {
          body:
            'O třetím úniku se lidé nejvíc přou, tak k němu konkrétně. Když tvůj generátor fixture dat píše reklamační tickety ve tvaru „Vrátili jsme N kusů v DEN a pořád nemám dobropis“ a případy v odložené sadě vypadly z téhož generátoru, pak router, který se chytá na „pořád nemám dobropis“, skóruje dobře na obojím. Na zákazníkovi, který napíše „nikdo mi nic nevrátil“, propadne. Ta věta v sadě nikdy nebyla, takže ti to vyhodnocení nemělo šanci říct.',
        },
        {
          body:
            'Odložená sada o dvanácti případech se hne o osm bodů pokaždé, když se překlopí jeden případ. Kandidát, který porazí baseline o jeden případ, ti neřekl skoro nic, a reportovat to jako zlepšení je tvrzení, které sada neunese. Napiš k číslu, z kolika případů vzniklo.',
        },
        {
          body:
            'Sada není hotová tím, že ji poprvé postavíš. Každý uniklý defekt je případ, který jsi neměl, takže zvyk zní: selhání zreprodukuj, zapiš ho jako případ s odpovědí, na které se operátor shodne, a když se ho chystáš opravit, dej ho do vývojové poloviny. Do odložené poloviny se přesune až po nasazení opravy — jinak jsi se potichu vrátil k ladění proti testovací sadě.',
        },
        {
          body:
            'Soubor drž ve verzovacím systému spolu s kódem a u každého případu zapiš, odkud pochází a kdo ho označkoval. NIST AI Risk Management Framework řadí dokumentaci a dohledatelnost mezi postupy, které dělají chování systému přezkoumatelným, a ve vyhodnocovací sadě to není papírování. Za půl roku se povede spor o to, jestli případ C-27 vůbec kdy patřil na tier-2, a odpověď na to je buď v záznamu, nebo nikde.',
        },
      ],
    },
    'fde-v1-m07-l2': {
      title: 'Kvalita proti ceně a latenci',
      summary:
        'Čtyři čísla místo jednoho, proč přesnost počítaná přes zodpovězené případy roste tím víc, čím méně systém odpovídá, který řez rostoucí souhrn zakrývá a jaké pravidlo porovnání si musíš napsat předem.',
      sections: [
        {
          body:
            'Někdo si u tebe vyžádá číslo přesnosti. Dej mu místo něj čtyři čísla, protože změna, která zlepší kterékoli z nich, to obvykle zaplatí z jiného — a jediný údaj nechá takový obchod proběhnout, aniž by si toho kdokoli všiml.',
        },
        {
          caption: 'Čtyři čísla, na kterých se kandidát reportuje, a co každé z nich vynechává.',
          headers: ['Číslo', 'Na co odpovídá', 'Co ti neřekne'],
          rows: [
            [
              'Přesnost přes všechny případy',
              'Kolik ze všeho, co přišlo, systém trefil',
              'Jestli se tam dostal tím, že odpověděl na všechno špatně, nebo na málo věcí velmi dobře',
            ],
            [
              'Pokrytí a míra abstencí vedle něj',
              'Kolik práce si systém vůbec vzal',
              'Jestli případy, které odmítl, byly ty těžké, nebo náhodná třetina',
            ],
            [
              'Cena na případ',
              'Kolik stojí zpracovat jeden ticket, v tokenech nebo ve voláních',
              'Kolik stojí abstence — ta faktura totiž přijde jako čas operátora',
            ],
            [
              'p95 latence',
              'Jak vypadá pomalý konec rozdělení',
              'Co dělalo nejpomalejších 5 %. p95 dvě sekundy se snese s p99 čtyřicet sekund',
            ],
          ],
        },
        {
          body:
            'Pokrytí je to, co se schová na očích. Systém, který odpoví na 24 z 36 případů a trefí 22 z nich, se dá vykázat dvěma způsoby: 22 z 36, tedy 0,61, nebo 22 z 24, tedy 0,92. Obojí je aritmetika. To druhé ti vypočítá reportovací kód omylem, protože dělit počtem řádků, které jsi vyrobil, je snazší než dělit počtem řádků, na které se tě někdo ptal.',
        },
        { caption: 'Tentýž běh, vykázaný poctivě. Ta dvě pole přesnosti se liší o třicet bodů a drží je od sebe jen jejich názvy.' },
        {
          body:
            'Publikovat `accuracyWhenAnswered` pod nálepkou „přesnost“ je nejčastější tichá lež ve vyhodnocovacím reportu a má spád: to číslo roste pokaždé, když systém odmítne případ, který by trefil špatně. Systém doladěný k častější abstenci pak vypadá jako systém, který se lepší — dokud někdo nespočítá, co teď čtou operátoři.',
        },
        {
          body:
            'Řezy jsou způsob, jak zjistit, odkud se ta přesnost vzala. Rozděl podle toho, podle čeho by dělil zákazník: téma ticketu, tenant, jazyk, kanál, účty na enterprise smlouvě. Marlbrookova sada dělí podle tématu — billing, delivery, returns — a dvanáct případů na řez je málo; jenže řez, který je moc malý na to, aby prokázal zhoršení, je stejně malý na to, aby prokázal, že žádné není.',
        },
        {
          caption: 'Kandidát proti baseline, řez po řezu, zakončený souhrnem, který ten třetí zakryje.',
          notes: [
            'Baseline na odložené sadě: 8 z 12 billing ticketů, 9 z 12 delivery, 10 z 12 returns, celkem 27 z 36.',
            'Billing řez kandidáta jde z 8 z 12 na 11 z 12. Tři tickety, které dřív končily ve špatné frontě, teď končí ve správné.',
            'Delivery jde z 9 z 12 na 12 z 12. Dva řezy ze tří jsou lepší a zatím ta změna vypadá jednoznačně.',
            'Returns padá z 10 z 12 na 7 z 12. Tři reklamační tickety, které dřív mířily správně, už nemíří — a souhrn se zatím nepočítal.',
            'Souhrn stoupne z 0,75 na 0,83. Report, který říká „přesnost se zlepšila o osm bodů“, je pravdivý a vynechává jediný řez, proti kterému by kdokoli něco namítl. Proto musí porovnání pojmenovat zhoršený řez hned vedle té výhry.',
          ],
        },
        {
          body:
            'Latenci reportuj jako percentil, ne jako průměr. Průměr běhu, kde 95 případů trvá 400 ms a 5 případů 30 s, vyjde pod dvě sekundy — a každý z těch pěti byl někdo, kdo koukal na spinner. Kniha Google SRE vede stejný argument pro service level objectives: uživatel zažívá rozdělení a percentil ho popíše tam, kde ho průměr zahladí. Surová čísla už máš v trasách: OpenTelemetry modeluje požadavek jako strom spanů se začátkem a koncem, takže krok vyhledání i volání modelu mají vlastní dobu trvání a ty umíš říct, která polovina p95 patří které.',
        },
        {
          body:
            'Cena má stejný problém dvou jmenovatelů jako přesnost. Cena na případ a cena na zodpovězený případ se rozjíždějí s rostoucí abstencí a to druhé číslo opatrnému systému lichotí. Účet má navíc část, která se ti na fakturu nikdy nedostane: abstinovaný ticket přečte operátor, a pokud jsou minuty operátorů ta baseline, kterou chceš porazit, je abstence případ, kde jsi ji neporazil.',
        },
        {
          caption: 'Deterministická baseline, změřená na téže sadě jako všechno ostatní.',
          headers: ['Kandidát', 'Přesnost · pokrytí', 'Cena a p95', 'Co tvrdí'],
          rows: [
            [
              'Router na klíčová slova, 40 pravidel',
              '0,75 · 1,00',
              '0,0000 USD · 12 ms',
              'Podlaha. Cokoli pomalejšího a dražšího tohle musí porazit o tolik, aby ten rozdíl stál za to',
            ],
            [
              'Jedno volání modelu, bez vyhledávání',
              '0,83 · 1,00',
              '0,0035 USD · 900 ms',
              'Osm bodů za třetinu centu a většinu sekundy na ticket',
            ],
            [
              'Volání modelu s hranicí pro abstenci',
              '0,61 · 0,67',
              '0,0040 USD · 1840 ms',
              'Trefí 22 z 24, na které odpoví, a 12 z 36 ticketů vrátí člověku',
            ],
          ],
        },
        {
          body:
            'Router na klíčová slova v prvním řádku je skutečná odpověď, ne slaměný panák. Nestojí nic, vrátí se za dvanáct milisekund, vedoucí provozu si ho přečte a padá způsoby, které někdo opraví v úterý odpoledne. Když je omezením 200 ms nebo pravidlo, které si musí přečíst zákazníkův auditor, vyhrává deterministický router po zásluze a „použij model“ je odpověď na otázku, kterou nikdo nepoložil.',
        },
        {
          body:
            'Pravidlo, které rozhodne o vítězi, napiš dřív, než porovnání spustíš. Naše pro tohle cvičení: kandidát, který odpovídá výrazně méně než baseline, prohrává bez ohledu na svou přesnost, a jinak vyhrává vyšší celková přesnost, pokud je rozdíl větší než bod. Pravidlo dané předem je to, co brání porovnání proměnit se v hledání rámce, ve kterém tvůj kandidát vyhraje — je to táž disciplína jako rozdělit sadu dřív, než začneš ladit.',
        },
        {
          body:
            'Ceny a latence v tabulce výš jsou vymyšlené hodnoty pro tuhle lekci. Mají správný řád pro routovací zátěž a nejsou měřením žádného poskytovatele. Vlastní kandidáty si naceň z vlastních běhů a přeměř je po každé změně modelu, délky promptu nebo kroku vyhledávání.',
        },
        {
          body:
            'Co ti report pořád neumí říct, stojí za to vyslovit nahlas při předání. Měří 36 ticketů z minulého čtvrtletí. Neříká nic o typu ticketu, který začal chodit v březnu, nic o dnech, kdy byl index vyhledávání šest týdnů pozadu, a nic o tom, jak by na tytéž tickety odpověděl živý model zítra. Tyhle věty patří pod tabulku a jejich vynechání je způsob, jak se z čísla poctivého v pondělí stane do pátku tvrzení.',
        },
      ],
    },
  },
  activities: {
    'fde-v1-m07-l1-read': {
      title: 'Čtení: referenční případy a únik dat',
      summary: 'Stavba označkované sady ze skutečných selhání, čtyři vlastnosti použitelného případu, rozdělení udělané jednou a tři tiché úniky.',
    },
    'fde-v1-m07-l2-read': {
      title: 'Čtení: kvalita proti ceně a latenci',
      summary: 'Čtyři čísla místo jednoho, páka abstencí na přesnost, řez zakrytý souhrnem a deterministická baseline měřená stejně.',
    },
    'fde-v1-m07-checks': {
      title: 'Čtení vyhodnocovacího reportu',
      summary:
        'Čtyři ohraničená rozhodnutí: které ze čtyř porovnání má únik dat, které číslo odpovídá na otázku vedoucího supportu, co znamená rostoucí souhrn spolu s padajícím řezem a proč míra abstencí stojí vedle přesnosti.',
      questions: {
        'fde-v1-m07-q1': {
          prompt: 'Čtyři týmy v Marlbrooku hlásí, že jejich kandidátský router porazil deterministickou baseline. Ve kterém porovnání je únik dat?',
          options: [
            'Tým A vzal 30 případů z ticketů přesměrovaných v minulém čtvrtletí, rozdělil je 20/10 dřív, než sáhl na router, ladil hranici jistoty proti těm 20 a reportoval těch 10.',
            'Tým B má v odložené sadě 12 případů a kandidát porazil baseline o dva z nich.',
            'Tým C napsal do promptu osm few-shot příkladů tak, že opsal osm nejtěžších případů z vyhodnocovací sady, a pak reportoval přesnost na téže sadě.',
            'Tým D porovnával proti routeru na klíčová slova bez modelu, což tým označuje za nefér porovnání, protože baseline nerozumí jazyku.',
          ],
          explanation:
            'Tým C dal systému odpovědi k osmi případům, na kterých se pak měří. Těch osm je teď učební materiál a sada měří, jak dobře router reprodukuje příklady, které dostal, ne jak si poradí s ticketem, který nikdy neviděl. Oprava je přesunout všech osm natrvalo do vývojové poloviny a reportovat zbytek. Tým A má tvar, který chceš: rozdělení proběhlo před laděním a reportované číslo vzniklo na případech, které žádné ladicí kolo nevidělo. Tým B má skutečnou slabinu, jenže to není únik — při 12 případech hne každý z nich skóre o osm bodů, takže výhra o dva případy leží v šumu a řešením je víc případů, ne jiné rozdělení. Tým D popisuje porovnání, které funguje, jak má: router na klíčová slova je podlaha a kandidát, který ji nepřeskočí, si svou cenu ani latenci nevysloužil.',
        },
        'fde-v1-m07-q2': {
          prompt:
            'Vedoucí supportu v Marlbrooku má jednu otázku: kolik ze 400 ticketů, které denně přijdou, se dá uzavřít, aniž je operátor přečte, při chybovosti, kterou už dnes akceptujeme? Kandidát odpoví na 60 % případů a na těch, na které odpoví, trefí 95 %. Které číslo na tu otázku odpovídá?',
          options: [
            '`accuracyWhenAnswered`, 0,95, protože vedoucí se ptá, jak často má asistent pravdu.',
            'Míra abstencí, 0,40, protože to je podíl, který operátor stejně musí přečíst.',
            'Pokrytí krát přesnost na zodpovězených, 0,57: podíl všech ticketů zároveň zodpovězených a zodpovězených správně, tedy zhruba 228 uzavřených denně, z toho asi 12 uzavřených do špatné fronty.',
            'p95 latence, protože ticket, který nestihne okno pro odpověď, se stejně neuzavře.',
          ],
          explanation:
            'Vedoucí chtěl počet ticketů, takže odpověď musí být podíl ze všech 400, ne podíl z nějaké podmnožiny. 0,60 × 0,95 dá 228 správně uzavřených a 0,60 × 0,05 dá těch 12 denně uzavřených do špatné fronty — a přesně o to číslo v otázce šlo. Samotné `accuracyWhenAnswered` říká, jak často má asistent pravdu, když promluví, a nic o tom, jak často promluví: systém odpovídající na tři tickety denně by vykázal tutéž 0,95. Míra abstencí počítá, co operátor pořád čte, a zastaví se o krok dřív: zbylých 60 % se nedá uzavřít celých a těch 12 chybných uzávěrek je právě to, na co se ptal. p95 latence je skutečné omezení a jiná otázka; v reportu patří vedle tohohle čísla, ne místo něj.',
        },
        'fde-v1-m07-q3': {
          prompt:
            'Kandidát zvedne celkovou přesnost na odložené sadě z 0,75 na 0,83. Po řezech: billing 0,67 → 0,92, delivery 0,75 → 1,00, returns 0,83 → 0,58. Co ta čísla dohromady znamenají?',
          options: [
            'Souhrn se musí přepočítat. Průměr, který nesouhlasí s jedním ze svých řezů, má špatné váhy.',
            'Obě čtení jsou pravdivá: kandidát je lepší na dvou řezech a horší na jednom, takže jeho nasazení přesouvá selhání na reklamační tickety a někdo musí rozhodnout, jestli je ten obchod přijatelný.',
            'Returns řez má 12 případů, takže pokles o tři leží v šumu a jednat se má podle souhrnu.',
            'Returns řez se z reportu může vynechat, protože kandidát zlepšuje číslo, na které se vedoucí supportu ptal.',
          ],
          explanation:
            'Souhrn i řezy jsou prosté počty přes tytéž 36 případů a shodují se: 30 správně proti 27, přičemž tři ze zisků se vzaly z reklamací. Přesně tohle průměr dělá a rozhodnutí, které tím zakryje, zní, jestli Marlbrook přijme tři další špatně směrované reklamační tickety výměnou za pět méně špatně směrovaných billing a delivery ticketů. Přepočet souhrnu nenajde nic, protože se nic nevážilo: průměr přes stejně velké řezy vyjde tak jako tak stejně. Označit ten pokles za šum je oprávněná obava a špatný závěr — 12 případů je málo na to, aby zhoršení o tři případy prokázalo, a stejně málo na to, aby prokázalo, že žádné není, takže odpovědí je víc reklamačních případů, ne rozhodnutí dívat se jinam. Vynechat řez z reportu je přesně to selhání, kvůli kterému tabulka po řezech existuje, a v operátorově týdnu se projeví tak, že reklamační tickety padají do špatné fronty, zatímco dashboard hlásí, že změna zabrala.',
        },
        'fde-v1-m07-q4': {
          prompt:
            'Dva kandidáti běží na týchž 36 případech odložené sady. A odpoví na všech 36 a trefí 27. B odpoví na 24 a trefí 22. Vykázáno jako jedno číslo přesnosti ukazuje A 0,75 a B 0,92. Proč musí míra abstencí stát vedle přesnosti?',
          options: [
            'Protože 0,92 u B je počítaná přes případy, na které se rozhodl odpovědět, a to číslo roste tím víc, čím méně systém odpovídá: přes všech 36 případů má B 22 správně, tedy 0,61. Ani jedno z těch čísel neznamená bez druhého nic.',
            'Protože abstence stojí víc než odpovědi, takže míra abstencí je vlastně měřítko ceny a patří do sloupce s cenou.',
            'Protože vysoká míra abstencí ukazuje, že je model dobře kalibrovaný, a kalibrace je vlastnost, kterou report testuje.',
            'Protože abstence se musí počítat jako špatné odpovědi, a 22 z 36 je tedy jediné poctivé číslo k publikování.',
          ],
          explanation:
            'B odmítl 12 případů a každý odmítnutý případ, který by trefil špatně, tlačí číslo přes zodpovězené nahoru. Samotná 0,92 dělá ze systému, který si vzal dvě třetiny práce, lépe vypadající systém než z toho, který si vzal všechnu a v absolutních počtech trefil víc případů. Abstence cenu má a přichází jako čas operátora, ne jako tokeny — jenže to patří do vlastního sloupce a není to důvod, proč pokrytí stojí vedle přesnosti. Ani častá abstence není důkazem kalibrace: systém, který odmítne všechno, abstinuje ve 100 % případů a nenaučil se nic, a kalibrace je samostatné tvrzení o tom, jestli deklarovaná jistota odpovídá pozorovaným výsledkům. Poslední možnost je polovina pravdy vydávaná za celek: 0,61 je správná celková přesnost a publikovat jen ji zakryje, že B trefí 22 z 24, na které odpoví — a přesně podle toho by ses rozhodoval, jestli zbylých 12 poslat člověku. Reportuj obojí.',
        },
      },
    },
    'fde-v1-m07-evaluation-metrics': {
      title: 'Metriky, které řez nezakryjí',
      summary:
        'Ohodnoť odloženou sadu na přesnost, pokrytí a čísla po řezech tak, aby abstence zůstaly vidět, pak porovnej dva kandidáty podle pravidla daného předem a označ řez, který souhrn pohřbil.',
      code: {
        prompt:
          'Odložená sada Marlbrooku má 36 support ticketů, dvanáct v každém ze tří řezů — `billing`, `delivery` a `returns` — a u každého případu je zapsaná fronta, na které se operátor shodl. Píšeš dvě funkce, které nad ní pouští kontrola před vydáním.\n\n**`evaluate(cases, predictions)`** vrátí jeden report:\n\n`{ total, answered, abstained, correct, accuracy, coverage, accuracyWhenAnswered, bySlice }`\n\n`cases` je pole `{ id, slice, expected }`. `predictions` je pole `{ caseId, answer }`. Počítej takhle:\n\n1. **Každý případ se počítá jednou**, ať pro něj predikce existuje, nebo ne. Případ bez predikce je abstence, ne chybějící řádek.\n2. **Platí první predikce.** Druhá predikce pro tentýž `caseId` se ignoruje, ať říká cokoli. Pipeline doručuje duplikáty.\n3. **Predikce, jejíž `caseId` neodpovídá žádnému případu, se ignoruje.** Přišla z jiného běhu.\n4. **Odpověď se počítá jako zodpovězená jen tehdy, když je to řetězec neprázdný po ořezání.** `null`, `undefined`, číslo, objekt i `\'   \'` jsou abstence.\n5. `accuracy` je `correct / total`, takže abstence jde proti tobě. `coverage` je `answered / total`. `accuracyWhenAnswered` je `correct / answered`. Když je jmenovatel `0`, vrať u kteréhokoli z nich `0`.\n6. **Každý poměr zaokrouhli** pomocí `Math.round(value * 10000) / 10000`. Počty zůstávají celá čísla.\n7. `bySlice` mapuje název každého řezu na objekt s týmiž sedmi poli, jen přes případy toho řezu. Případ, jehož `slice` není neprázdný řetězec, patří do řezu `unlabelled`.\n8. `cases`, které nejsou pole, dají report samých nul s prázdným `bySlice`. `predictions`, které nejsou pole, znamenají, že všechno abstinovalo.\n\n**`compare(baseline, candidate)`** vezme dva takové reporty a vrátí:\n\n`{ better, accuracyDelta, coverageDelta, regressedSlices, sliceMismatch, aggregateHidesRegression }`\n\n- Když některý argument není použitelný report — není objekt, nebo mu chybí `bySlice`, `accuracy` či `coverage` — vrať `better: \'not-comparable\'` s oběma rozdíly `0` a oběma poli prázdnými.\n- `sliceMismatch` obsahuje vzestupně seřazené názvy řezů, které jsou v jednom reportu a ve druhém ne. Když není prázdné, neběžely oba běhy nad touž sadou: vrať `better: \'not-comparable\'`, oba rozdíly `0` a `regressedSlices: []`, ale seznam neshod zachovej.\n- Jinak je `accuracyDelta` rovno `candidate.accuracy - baseline.accuracy` a `coverageDelta` rovno `candidate.coverage - baseline.coverage`, obojí počítané z už zaokrouhlených poměrů a zaokrouhlené znovu stejně.\n- `regressedSlices` drží jedno `{ slice, baselineAccuracy, candidateAccuracy, delta }` za každý řez, jehož přesnost klesla, seřazené vzestupně podle názvu řezu. `delta` je kandidát mínus baseline, zaokrouhleno.\n- **Pravidlo pro `better`, aplikované v tomto pořadí:** `coverageDelta < -0.05` dá `\'baseline\'`, protože kandidát, který odpovídá výrazně méně, si svou přesnost koupil vrácením práce zpátky. Pak `accuracyDelta > 0.01` dá `\'candidate\'`, `accuracyDelta < -0.01` dá `\'baseline\'` a co zbude, je `\'tie\'`.\n- `aggregateHidesRegression` je `true`, když je `better` rovno `\'candidate\'` nebo `\'tie\'` a `regressedSlices` není prázdné. To je ta značka: souhrn neprohrál a aspoň jeden řez ano.\n\nJedno fixture je důležitější než ostatní. `__predictions(\'candidate\')` poráží `__predictions(\'baseline\')` 30 správných ku 27, zatímco jeho returns řez padá z 10 z 12 na 7 z 12 — porovnání, které čte jen souhrn, tedy hlásí čistou výhru přes tři tickety, které přestaly chodit do správné fronty.\n\n`__cases`, `__predictions`, `__CASE_ROWS` a `__PATTERNS` pocházejí z harness úlohy. Každý případ, značka i predikce v nich jsou vymyšlené pro tohle cvičení a na každém běhu stejné. Nic tady nevolá model ani neotevírá síťové spojení a přesnost nad fixture daty není důkaz o tom, jak by na těchhle ticketech skóroval živý router.',
        contract: [
          'Každý případ v `cases` započítej přesně jednou, včetně případů, které žádná predikce nezmiňuje.',
          'Platí první predikce pro daný `caseId`; další se ignorují. `caseId`, který neodpovídá žádnému případu, se ignoruje.',
          'Odpověď se počítá jako zodpovězená jen tehdy, když je to řetězec neprázdný po ořezání.',
          'Každý poměr zaokrouhli pomocí `Math.round(value * 10000) / 10000` a vrať 0 všude, kde je jmenovatel 0. Nikdy nedělej dělení nulou.',
          'Nikdy nereportuj `correct / answered` jako `accuracy`. Ta dvě pole jsou oddělená a povinná jsou obě.',
          'Needituj `cases` ani `predictions`. `compare` čte jen ty dva reporty a nikdy nesahá zpátky na případy.',
          '`__cases`, `__predictions`, `__CASE_ROWS` a `__PATTERNS` pocházejí z harness úlohy. Čti z nich, nepředefinovávej je.',
        ],
        hints: [
          'Vyhledávací tabulku odpovědí postav vlastním průchodem dřív, než začneš cokoli počítat. `caseId` zapiš jen tehdy, když ho tabulka ještě nemá, a z jedné kontroly přes `hasOwnProperty` dostaneš zároveň „platí první predikce“ i „duplikáty se ignorují“.',
          'Drž jedno počítadlo na řez a jedno na celou sadu a aktualizuj obě v témž cyklu přes `cases`. Pak všechna prožeň stejnou pomocnou funkcí, aby se řez nikdy nepočítal jiným pravidlem než celek.',
          'Test na abstenci napiš jako „tohle není neprázdný řetězec“, ne jako „tohle je null“. Číslo, objekt i tři mezery musí padnout na tutéž stranu a fixture sady obsahují všechny tři.',
        ],
        approach: [
          'Projdi `predictions` jednou do mapy `caseId → answer`, u každého id si nech první záznam a přeskoč záznamy, které nejsou objekt nebo jejichž `caseId` není řetězec.',
          'Projdi `cases` jednou a přidej každý případ do celkového počítadla i do počítadla svého řezu: zodpovězený, když je jeho odpověď neprázdný řetězec, správný, když se ta odpověď rovná `expected`, jinak abstence.',
          'Každé počítadlo převeď jednou pomocnou funkcí na sedmipoložkový tvar; děl jen tehdy, když je jmenovatel nad nulou, a zaokrouhluj na čtyři místa.',
          'V `compare` odmítni nepoužitelný report a pak neshodu názvů řezů dřív, než cokoli spočítáš, aby porovnání dvou různých sad nikdy nevyrobilo rozdíl.',
          'Spočítej oba rozdíly i seznam zhoršených řezů, aplikuj pravidlo o pokrytí před pravidlem o přesnosti a nastav značku, když souhrn neprohrál a řez ano.',
        ],
        testLabels: [
          'baseline odpoví na každý případ a dá 27 z 36',
          'returns řez nese stejných sedm polí jako celá sada',
          'opatrný běh má 0,9167 na tom, co zodpověděl, a 0,6111 přes sadu',
          'běh, který neodpověděl na nic, vrátí nuly místo dělení nulou',
          'chybějící řádky, duplikáty, cizí case id a tři poškozené odpovědi se počítají podle pravidel',
          'kandidát vyhraje souhrn a zhoršení returns je pojmenované hned vedle',
          'kandidát s 0,9167 na tom, co zodpověděl, stejně prohrává na pokrytí',
          'dva běhy nad různými sadami dají neshodu místo rozdílu',
        ],
        criteria: [
          {
            label: 'Správné počty, poměry a pravidlo porovnání',
            detail:
              'Zkontroluj čtyři pravidla počítání — každý případ jednou, platí první predikce, cizí `caseId` se ignoruje, poškozená odpověď je abstence — a k tomu zaokrouhlení na čtyři místa, případy s nulovým jmenovatelem a pořadí, ve kterém se aplikuje pravidlo pro `better`.',
          },
          {
            label: 'Zhoršený řez je vypsaný a označený',
            detail:
              'Řez, jehož přesnost klesla, musí být v `regressedSlices` seřazený podle názvu, s oběma přesnostmi i rozdílem, a `aggregateHidesRegression` musí naskočit, když souhrn neprohrál. Porovnání, které čte jen dvě celková čísla, kandidáta potichu pustí dál a spadne tady.',
          },
          {
            label: 'Abstence zůstávají v číslech vidět',
            detail:
              '`accuracy` je přes všechny případy a `accuracyWhenAnswered` přes zodpovězené; vykázat druhé jako první je selhání, které tohle kritérium chytá. `coverage` a `abstained` se musí hýbat s nimi a běh, který neodpověděl na nic, nesmí dělit nulou.',
          },
        ],
      },
    },
  },
};
