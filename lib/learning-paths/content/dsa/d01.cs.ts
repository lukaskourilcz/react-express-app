/** Czech copy for D01. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D01_CS: ModuleCs = {
  title: 'Big O, růst a paměť',
  outcomes: [
    'Určit nejtěsnější třídu růstu, kterou kód podporuje, zvlášť pro čas a zvlášť pro paměť navíc.',
    'Říct, jaký nákladový model předpokládáš — co se počítá jako jeden krok — dřív, než třídu uvedeš.',
    'Rozlišit horní odhad od nejhoršího případu a dominantní člen od konstantního násobku.',
  ],
  lessons: {
    'dsa-v1-d01-l1': {
      title: 'Počítáme práci, ne sekundy',
      summary: 'Co třída růstu tvrdí, proč je užitečná ta nejtěsnější a kam do toho patří nejlepší, průměrný a nejhorší případ.',
      sections: [
        {
          body:
            'Když funkci změříš stopkami, dozvíš se něco o svém notebooku. Když jí spočítáš kroky, dozvíš se něco o té funkci. Big O je to druhé: tvrzení o tom, jak počet kroků roste s velikostí vstupu, se strojem záměrně vynechaným.',
        },
        {
          body:
            'Napsat O(f(n)) znamená tvrdit, že od nějaké velikosti vstupu výš zůstanou skutečné náklady pod konstantním násobkem f(n). Je to horní odhad — a je to odhad té nákladové funkce, kterou sis vybral k analýze. Právě tu druhou půlku lidé vynechávají, a proto je věta „O(n²) je nejhorší případ“ dvě různé myšlenky slepené dohromady.',
        },
        {
          body:
            'Nejlepší, průměrný a nejhorší případ říkají, *kterou* nákladovou funkci popisuješ — nejlevnější vstup dané velikosti, typický, nebo ten nejdražší. Big O pak omezuje tu, kterou sis vybral. Klidně můžeš napsat horní odhad nejlepšího případu; jen toho říká míň.',
        },
        {
          body:
            'Protože je O horní odhad, je O(n²) technicky pravdivé i o funkci, která projde vstup jednou. Je to ale k ničemu. Když se tedy otázka ptá na třídu růstu, ptá se na nejtěsnější třídu, kterou kód podporuje: na nejmenší rodinu, kterou můžeš poctivě tvrdit.',
        },
        { caption: 'Dva cykly za sebou: 2n kroků, což je pořád lineární rodina.' },
        {
          caption: 'Dva průchody nad stejným seznamem, s kroky spočítanými místo změřenými.',
          note: 'Zdvojnásob vstup a počet se zdvojnásobí: to je lineární růst. Změň seznamy a zkus, jestli to platí dál.',
        },
        {
          body:
            'Dva průchody za sebou stojí 2n kroků a 2n je konstantní násobek n, takže třída je O(n). Konstanty a členy nižšího řádu odpadají, protože s rostoucím n přestávají hrát roli: n² + 500n + 9000 je O(n²) a pro dost velké n je těch 500n zaokrouhlovací chyba vedle n².',
        },
        {
          body:
            'Zahazování konstant je tvrzení o růstu, ne o rychlosti. Funkce s 2n kroky opravdu trvá zhruba dvakrát déle než funkce s n kroky na stejném vstupu. Big O říká, že škálují stejně, ne že stojí stejně.',
        },
        {
          body:
            'Rodiny se mění při vnořování. Cyklus uvnitř cyklu nad stejným n-prvkovým vstupem navštíví zhruba n² dvojic. Samotné vnoření ale kvadratickou složitost nedělá — rozhoduje, kolikrát se tělo vnitřního cyklu skutečně provede.',
        },
        { caption: 'Dva nezávislé vstupy: náklady jsou O(nm) a označit to za O(n²) zakryje, který vstup zmenšit.' },
        {
          body:
            'Dva vnořené cykly nad dvěma *různými* kolekcemi stojí O(nm). Dva cykly za sebou nad dvěma různými kolekcemi stojí O(n + m). Sloučit kterýkoli z nich do O(n²) zahodí právě to, podle čeho by ses rozhodoval — který z těch dvou vstupů je ten drahý.',
        },
        {
          caption: 'Osm rodin, které tato cesta žádá poznat, a tvar, který každou z nich vyrábí.',
          headers: ['Třída', 'Co ji vyrábí', 'Příklad'],
          rows: [
            ['O(1)', 'Pevný počet kroků bez ohledu na velikost vstupu', 'Přečtení `values[0]`'],
            ['O(log n)', 'Opakované půlení nebo zdvojnásobování', 'Binární vyhledávání v seřazeném poli'],
            ['O(n)', 'Jeden průchod vstupem', 'Součet všech prvků'],
            ['O(n log n)', 'Logaritmicky mnoho úrovní, lineární práce na úroveň', 'Merge sort'],
            ['O(n²)', 'Každá dvojice n-prvkového vstupu', 'Selection sort'],
            ['O(n³)', 'Tři vnořené n-prvkové rozměry', 'Naivní násobení matic'],
            ['O(2ⁿ)', 'Dvojí volba v každém z n kroků', 'Výpis všech podmnožin'],
            ['O(n!)', 'Každé pořadí n prvků', 'Výpis všech permutací'],
          ],
        },
        {
          body:
            'Poslední dvě jsou cíle k rozpoznání, ne k implementaci. Měl bys umět kouknout na funkci, která se v každém kroku větví na dvě strany, a říct „tohle se s každým dalším prvkem zdvojnásobí, takže 40 prvků je už mimo dosah“ — aniž bys to dokazoval napsáním generátoru podmnožin.',
        },
        {
          caption: 'Půlení šestnáctky až na jedničku: čtyři kroky, a proto je opakované půlení logaritmická rodina.',
          notes: [
            'Začínáme na 16. Zatím žádné půlení neproběhlo.',
            '16 se půlí na 8. Jeden krok.',
            '8 se půlí na 4. Dva kroky.',
            '4 se půlí na 2. Tři kroky.',
            '2 se půlí na 1 a půlení končí. Čtyři kroky na šestnáct prvků — to je log₂ 16.',
          ],
          counterLabels: ['Půlení', 'Půlení', 'Půlení', 'Půlení', 'Půlení'],
        },
        {
          body:
            'Zdvojnásobení vstupu přidá jeden krok, ne dvojnásobek kroků. V tom je celé kouzlo logaritmické rodiny a proto se často vyplatí jednou seřadit, aby se pak dalo opakovaně binárně vyhledávat.',
        },
        {
          body:
            'Základy logaritmu se liší jen konstantním násobkem, takže O(log₂ n) a O(log₁₀ n) jsou tatáž třída a obojí se píše O(log n). Tato cesta počítá půlení, takže její ukázky používají základ 2.',
        },
        {
          body:
            'Za zmínku stojí dva sousedé. Θ (théta) je těsný odhad — horní *i* dolní odhad téže rodiny, takže náklady opravdu rostou právě takhle. Ω (omega) je dolní odhad: náklady jsou aspoň takové. Tato cesta se všude ptá na O a žádá to nejtěsnější, což je pro kód, který tu potkáš, dost blízko k Θ.',
        },
      ],
    },
    'dsa-v1-d01-l2': {
      title: 'Paměť a nákladový model, který jsi předpokládal',
      summary: 'Pomocná paměť proti celkové, paměť, kterou si půjčuje zásobník rekurze, a co se vzalo za „jeden krok“.',
      sections: [
        {
          body:
            'Čas je jedna odpověď; paměť je druhá, samostatná. Dvě funkce, které obě běží v O(n), se můžou úplně lišit v tom, co alokují — a na velkém vstupu selže právě ten rozdíl.',
        },
        {
          body:
            'Celková paměť počítá i vstup. Pomocná paměť počítá jen to, co funkce alokuje navíc. Obě odpovědi jsou legitimní, takže užitečný zvyk je říct, kterou myslíš: „lineární čas, konstantní pomocná paměť“ nenechává nic k hádání.',
        },
        { caption: 'Stejný lineární čas, jiná pomocná paměť.' },
        {
          body:
            'Obvyklým zdrojem toho rozdílu je kopírování a v JavaScriptu se dá udělat omylem. `slice`, `map`, `filter`, `concat` i rozbalení pole vytvoří nové pole. Uvnitř cyklu udělá nevinně vypadající `values.slice(1)` z lineární funkce kvadratickou, protože každá kopie je sama lineární.',
        },
        {
          body:
            'Stejná past platí pro `shift` a `unshift`. Odebrání prvního prvku pole znamená, že se každý další prvek posune o místo níž, takže je to lineární v délce pole — ne konstantní operace, jak to jednoslovné volání napovídá.',
        },
        {
          body:
            'Rekurze si půjčuje paměť, aniž by alokovala cokoli viditelného. Každé rozpracované volání drží rámec na zásobníku, takže řetěz n volání do hloubky potřebuje O(n) paměti zásobníku, i kdyby tělo funkce nealokovalo vůbec nic. Cyklus, který dělá totéž, nepotřebuje nic z toho.',
        },
        { caption: 'Lineární čas i lineární paměť zásobníku: n rámců je otevřených, než se první z nich vrátí.' },
        {
          body:
            'Předzpracování je druhá strana účtu. Seřadit pole stojí jednou O(n log n). Pokud ti to koupí binární vyhledávání pro každé další hledání, klesne tisíc hledání z tisíce lineárních průchodů na tisíc logaritmických a řazení se mnohonásobně zaplatí. Při jednom jediném hledání se nezaplatí nikdy.',
        },
        {
          body:
            'Tohle všechno stojí na nákladovém modelu: na předpokladu, co se počítá jako jeden krok. Tato cesta používá obvyklý výukový model — přečtení nebo zápis jedné položky pole, porovnání dvou čísel a jedna aritmetická operace jsou každé jeden krok. Řekni to, když třídu uvádíš, protože právě model dává tomu číslu smysl.',
        },
        {
          caption: 'Předpoklady, které tato cesta dělá, a co neslibují.',
          headers: ['Předpoklad', 'Co tu znamená', 'Co netvrdí'],
          rows: [
            [
              'Indexace pole je jeden krok',
              'Přečtení `values[i]` se počítá jako jedna operace',
              'Že je pole v JavaScriptu souvislé céčkové pole; enginy používají několik reprezentací',
            ],
            [
              'Přidání na konec je amortizovaně jeden krok',
              'Dlouhá řada volání `push` vyjde v průměru na konstantní práci',
              'Že je konstantní každé jednotlivé `push` — občasné zvětšení pole není',
            ],
            [
              'Operace nad Map a Set jsou očekávaně konstantní',
              '`get`, `set` a `has` vyjdou v průměru na pevný počet kroků',
              'Záruku pro nejhorší případ; při silných kolizích se to blíží lineárnímu času',
            ],
            [
              'Základní BST stojí O(h)',
              'Hledání a vkládání jde po jedné cestě od kořene k listu o výšce h',
              'Že h je log n — nevyvážený strom může být řetěz, a pak se h rovná n',
            ],
          ],
        },
        {
          body:
            'Číselný vstup má ještě druhou past. Cyklus, který proběhne `n`krát, je lineární v *hodnotě* n, jenže n se zapíše zhruba log n číslicemi, takže vůči velikosti svého vstupu je ta funkce exponenciální. Tato cesta zůstává u jednotkového nákladového modelu a malých vstupů — a říká to tam, kde na tom záleží.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d01-l1-read': {
      title: 'Čtení: počítáme práci, ne sekundy',
      summary: 'Třídy růstu, nejtěsnější podporovaná odpověď a kam patří nejlepší, průměrný a nejhorší případ.',
    },
    'dsa-v1-d01-l2-read': {
      title: 'Čtení: paměť a nákladový model, který jsi předpokládal',
      summary: 'Pomocná proti celkové paměti, hloubka zásobníku rekurze, cena kopírování a uvedené předpoklady.',
    },
    'dsa-v1-d01-checks': {
      title: 'Kontrola růstu a paměti',
      summary: 'Čtyři otázky nad novými ukázkami: nejtěsnější třída, dva nezávislé vstupy, pomocná paměť a co Big O vlastně tvrdí.',
      questions: {
        'dsa-v1-d01-q1': {
          prompt: 'Jaká je nejtěsnější třída růstu pro dobu běhu funkce `summarise` vzhledem k délce n pole `values`?',
          options: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
          explanation:
            'Dva cykly běží za sebou, takže práce je 2n plus pár čtení v konstantním čase. Konstantní násobky a členy nižšího řádu odpadají a zůstane O(n). Cykly za sebou se sčítají; násobí se jen vnořené. O(n²) by byl pravdivý horní odhad, ale ne ten nejtěsnější — a otázka se ptá na nejtěsnější.',
        },
        'dsa-v1-d01-q2': {
          prompt: '`labels` má n položek a `sizes` má m položek, přičemž délky spolu nesouvisí. Jaká je nejtěsnější třída růstu funkce `combine`?',
          options: ['O(nm)', 'O(n²)', 'O(n + m)', 'O(n log m)'],
          explanation:
            'Vnitřní cyklus proběhne m krát pro každou z n vnějších iterací, takže se tělo provede nm krát. Označit to za O(n²) by předpokládalo, že oba vstupy rostou spolu, a zakrylo by to užitečnou informaci: pomůže zmenšit ten seznam, který je delší. O(n + m) by byla odpověď, kdyby cykly byly za sebou, ne vnořené.',
        },
        'dsa-v1-d01-q3': {
          prompt: 'Jaká je pomocná paměť — paměť použitá nad rámec samotného vstupu — funkce `runningTotals` pro vstup délky n?',
          options: [
            'O(n) — vracené pole doroste do délky vstupu',
            'O(1) — alokuje se jen `sum`',
            'O(n²) — jedna položka pole na každou dvojici vstupů',
            'O(log n) — pole se při růstu zdvojnásobuje',
          ],
          explanation:
            '`out` skončí s jednou položkou na každý prvek vstupu, takže je lineární v n. Jediný akumulátor `sum` je konstantní a třídu nemění. Zdvojnásobování, které rostoucí pole dělá uvnitř, ovlivňuje, jak často se zvětšuje, ne kolik nakonec drží.',
        },
        'dsa-v1-d01-q4': {
          prompt: 'Kolega říká: „Tohle hledání je O(n), takže n kroků je jeho nejhorší případ.“ Co je na té větě špatně?',
          options: [
            'O(n) je horní odhad toho případu, který se analyzuje; sám o sobě nejhorší případ neznamená.',
            'Nic — O(n) a „nejhorší případ“ znamenají totéž.',
            'O(n) popisuje paměť, takže o krocích nemůže říct nic.',
            'O(n) znamená přesně n kroků, takže „nejhorší případ“ je nadbytečný.',
          ],
          explanation:
            'Nejlepší, průměrný a nejhorší případ říkají, který vstup velikosti n oceňuješ; Big O omezuje tu nákladovou funkci, kterou sis vybral. Stejně legitimně můžeš omezit nejlepší případ. A O(n) neznamená přesně n kroků — znamená, že růst zůstane v konstantním násobku n, takže 3n + 12 je taky O(n).',
        },
      },
    },
    'dsa-v1-d01-linear-accumulator': {
      title: 'Jeden průchod, spočítaný',
      summary: 'Sečti sudá čísla jediným průchodem a dolož to tím, že zůstaneš v rozpočtu jednoho čtení na prvek.',
      code: {
        prompt:
          'Napiš funkci `sumOfEvens(values)`, která vrátí součet sudých čísel v poli celých čísel. `sumOfEvens([1, 2, 3, 4])` dá 6 a prázdné pole dá 0. Záporná sudá čísla se počítají a nula je sudá.\n\nHodnocení počítá, kolikrát přečteš prvek podle indexu. Povolený je jeden průchod: nejvýš jedno čtení na prvek. Přečíst tentýž prvek dvakrát nebo projít pole podruhé znamená překročení rozpočtu, i když je výsledek správný.',
        contract: [
          'Přečti každý prvek nejvýš jednou — hodnocený rozpočet je jedno čtení na prvek.',
          'Vstup neřaď, nekopíruj ani nekrájej; kopie přečte každý prvek znovu.',
          'Vrať číslo a pro prázdné pole vrať 0.',
        ],
        hints: [
          'Jediný cyklus `for…of` navštíví každý prvek přesně jednou, což je celý rozpočet — uvnitř rozhodni, jestli je hodnota sudá, a buď ji přičti, nebo přeskoč.',
          'Číslo je sudé, když je zbytek po dělení dvěma nula. Ten test funguje i pro záporná: -4 % 2 je 0.',
        ],
        approach: [
          'Začni s průběžným součtem na nule.',
          'Projdi pole jednou a postupně navazuj každý prvek.',
          'Přičti prvek k součtu, když je jeho zbytek po dělení dvěma nula.',
          'Vrať součet; prázdné pole do cyklu vůbec nevstoupí a dá nulu.',
        ],
        criteria: [
          {
            label: 'Správný součet včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, pole bez sudých čísel, záporná sudá čísla a nulu.',
          },
          {
            label: 'Nejvýš jedno čtení na prvek',
            detail: 'Počítadlo čtení překročilo jedno na prvek. Projeví se tu druhý průchod, kopie i opakované čtení prvku uvnitř cyklu.',
          },
        ],
        testLabels: ['', 'prázdné pole dá nulu', 'žádná sudá čísla dají nulu', 'záporná čísla a nula jsou taky sudá', 'šest prvků se přečte nejvýš šestkrát'],
      },
    },
    'dsa-v1-d01-halving-counter': {
      title: 'Počítadlo půlení',
      summary: 'Spočítej půlení potřebná k dosažení jedničky — tvar, který stojí za každou logaritmickou funkcí.',
      code: {
        prompt:
          'Napiš funkci `halvingSteps(n)`, která vrátí, kolikrát se dá celé číslo od 1 výš půlit — vždy se zaokrouhlením dolů — než dosáhne 1. `halvingSteps(1)` dá 0, `halvingSteps(8)` dá 3 a `halvingSteps(10)` dá 3, protože 10 jde na 5, pak na 2 a pak na 1.\n\nJe to počet kroků, které udělá binární vyhledávání v poli o n prvcích, a proto zdvojnásobení vstupu přidá jeden krok místo dvojnásobku práce.',
        contract: [
          'Půl dělením dvěma se zaokrouhlením dolů, ne přesným dělením.',
          'Počítej půlení, ne navštívené hodnoty: dostat se z 1 na 1 je nula kroků.',
          'Vstup je celé číslo od 1 výš.',
        ],
        hints: [
          'Drž si počítadlo a pracovní hodnotu. Dokud je hodnota nad 1, půl ji pomocí `Math.floor(value / 2)` a přičti k počítadlu jedničku.',
          'Začátek na 1 znamená, že se tělo cyklu vůbec neprovede, takže odpověď je 0. To je základ logaritmu, ne zvláštní případ k natvrdo napsání.',
        ],
        approach: [
          'Začni s počítadlem kroků na nule a zkopíruj vstup do pracovní hodnoty.',
          'Dokud je pracovní hodnota větší než 1, nahraď ji její polovinou zaokrouhlenou dolů.',
          'Při každém půlení přičti k počítadlu jedničku.',
          'Vrať počítadlo, jakmile hodnota dosáhne 1.',
        ],
        testLabels: ['jednička už tam je', '', 'zaokrouhlení dolů: 10, 5, 2, 1', 'nejmenší půlení', 'tisíc prvků v deseti krocích'],
      },
    },
    'dsa-v1-d01-pair-versus-pass': {
      title: 'Průchod místo všech dvojic',
      summary: 'Největší rozdíl v poli, v rozpočtu čtení, který vylučuje porovnávání všech dvojic.',
      code: {
        prompt:
          'Napiš funkci `maxGap(values)`, která vrátí rozdíl mezi největším a nejmenším číslem v poli. `maxGap([3, 9, 1])` dá 8. Pole s jedním prvkem dá 0 a prázdné pole dá 0.\n\nPorovnání všech dvojic by na to odpovědělo taky a přečetlo by pole zhruba n²/2 krát. Hodnocení povoluje nejvýš dvě čtení na prvek, do čehož se pohodlně vejde jediný průchod, který si drží zatím nejmenší a největší hodnotu — a do čehož se párové porovnávání vejít nemůže.',
        contract: [
          'Přečti každý prvek nejvýš dvakrát — hodnocený rozpočet je 2n čtení pro n prvků.',
          'Pole neřaď: řazení čte a zapisuje mnohem víc, než rozpočet dovolí.',
          'Prázdné pole i pole s jedním prvkem dají 0.',
        ],
        hints: [
          'Dvojice nepotřebuješ. Největší rozdíl je vždycky mezi nejmenším a největším prvkem, takže stačí jeden průchod, který si oba pamatuje.',
          'Nastav nejmenší i největší na první prvek a pak proti nim porovnávej každý další.',
        ],
        approach: [
          'Když má pole méně než dva prvky, vrať rovnou 0.',
          'Nastav nejmenší i největší hodnotu na první prvek.',
          'Projdi pole jednou a sniž nejmenší nebo zvyš největší, kdykoli prvek padne mimo tu dvojici.',
          'Vrať největší minus nejmenší.',
        ],
        criteria: [
          {
            label: 'Správný rozdíl včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, pole s jedním prvkem, pole se samými stejnými hodnotami a záporné hodnoty.',
          },
          {
            label: 'Nejvýš dvě čtení na prvek',
            detail: 'Počítadlo čtení překročilo 2n. Spadá sem porovnávání všech dvojic i řazení předem — výsledek může být správně a přesto minout smysl cvičení.',
          },
        ],
        testLabels: ['', 'prázdné pole nemá rozdíl', 'jeden prvek nemá rozdíl', 'záporné hodnoty', 'všechny stejné', 'šest prvků se přečte nejvýš dvanáctkrát'],
      },
    },
  },
};
