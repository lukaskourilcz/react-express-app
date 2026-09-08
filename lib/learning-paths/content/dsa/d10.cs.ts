/** Czech copy for D10. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. The module has no lessons, so `lessons` is empty. */

import type { ModuleCs } from '../../types';

export const DSA_D10_CS: ModuleCs = {
  title: 'Závěrečné ověření základů',
  outcomes: [
    'Odpovědět na otázky o růstu, strukturách, vyhledávání, řazení a stromech, které jsi ještě neviděl, a bez otevřených výukových modulů.',
    'Postavit logaritmické hledání nad seřazeným polem záznamů, opravit rozbitý průchod po hladinách a zaindexovat jednou místo hledání při každém dotazu.',
    'Brát výsledek tak, jak je: doklad toho, co jsi předvedl na těchhle cvičeních, ne tvrzení, že ti látka bez procvičování zůstane.',
  ],
  lessons: {},
  activities: {
    'dsa-v1-d10-final-checks': {
      title: 'Závěrečná kontrola v pěti oblastech',
      summary:
        'Deset otázek, které jsi neviděl: dvě na růst a paměť, dvě na struktury, dvě na vyhledávání, dvě na řazení a dvě na stromy. Každá oblast se hodnotí zvlášť a každá musí sama o sobě dosáhnout 80 %, takže silné skóre v řazení nezakryje chybějící odpověď o stromech. Opakovat můžeš, kolikrát chceš.',
      questions: {
        'dsa-v1-d10-q1': {
          prompt: 'Oba vstupy spolu nesouvisí: `spans` má n položek a `notes` má m. Jaká je nejtěsnější třída růstu pro dobu běhu funkce `report`?',
          options: ['O(n² + m)', 'O(n²)', 'O(n²m)', 'O(nm)'],
          explanation:
            'Vnitřní cyklus začíná na `i + 1`, takže cyklus přes dvojice proběhne n(n-1)/2 krát. Polovina n² je konstantní násobek n², takže trojúhelníkový cyklus je pořád kvadratická rodina. Cyklus přes notes je samostatný a proběhne m krát, a cyklus za sebou nad nesouvisejícím vstupem se přičítá místo násobení — vyjde O(n² + m). Zahodit m předpokládá, že m nikdy nepřeroste n², a to tu nikde nestojí. O(n²m) by platilo, kdyby cyklus přes notes byl vnořený do cyklu přes dvojice. O(nm) špatně čte mez vnitřního cyklu, který jde přes spans, ne přes notes.',
        },
        'dsa-v1-d10-q2': {
          prompt: 'Jaká je pro vstup délky n pomocná paměť — paměť použitá nad rámec samotného vstupu — funkce `buildRuns`?',
          options: [
            'O(n) — pole s běhy dohromady drží jednu položku na každý prvek vstupu',
            'O(1) — deklarované jsou jen `runs` a `current`, ať je vstup jakkoli velký',
            'O(n²) — pro každý prvek vzniká jedno pole a každé z nich může dorůst do délky vstupu',
            'O(k), kde k je počet různých hodnot a nezávisí na n',
          ],
          explanation:
            'Každý prvek se vloží přesně do jednoho pole běhu, takže ta pole dohromady drží n položek a je jich nejvýš n. Počítat deklarace neznamená počítat paměť: `runs` i `current` jsou jména pro struktury, které obě rostou se vstupem. Nic nekopíruje vstup jednou za prvek, takže se součet nikdy nedostane na n². A počet různých hodnot to taky neomezuje: `[1, 2, 1, 2, 1, 2]` má dvě různé hodnoty a šest běhů.',
        },
        'dsa-v1-d10-q3': {
          prompt:
            'Handlery se ukládají pod id požadavků, která přicházejí jako řetězce, a některá jsou čistě číslice, třeba `"12"` a `"305"`. Kód hledá handler podle id při každém požadavku a jednou za minutu projde všechny záznamy v pořadí, v jakém se handlery registrovaly. Která struktura sedí a proč?',
          options: [
            '`Map`: `get` je očekávaně konstantní, klíče se procházejí v pořadí vložení bez ohledu na to, jak vypadají, a id jako `"toString"` je obyčejný klíč.',
            'Obyčejný objekt: přístup k vlastnosti je očekávaně konstantní a klíče se vrací v pořadí, v jakém se přiřazovaly.',
            '`Set` s id: test na členství je očekávaně konstantní a procházení jde v pořadí vložení.',
            'Pole dvojic `[id, handler]`: přesně zachová pořadí registrace a hledání je jedno čtení podle indexu.',
          ],
          explanation:
            'Map splní obojí: očekávaně konstantní hledání a procházení v pořadí vložení pro klíče libovolného tvaru. Obyčejný objekt přerovnává klíče, které vypadají jako indexy pole, takže `"12"` a `"305"` se projdou první a vzestupně podle čísla, před vším, co se registrovalo dřív. Jeho prototyp navíc už odpovídá na jména jako `"toString"`, takže hledání může vrátit funkci, kterou nikdo neregistroval. Set drží jen členství a handler není kam uložit. Pole dvojic pořadí zachová, ale hledání ho musí projít, což je O(n) na požadavek místo očekávaně konstantního času.',
        },
        'dsa-v1-d10-q4': {
          prompt: 'Tenhle kontrolér používá pole jako zásobník a má vrátit `true` jen tehdy, když závorky sedí. Který vstup ho donutí vrátit `true`, i když by neměl?',
          options: [
            '`"())"` — třetí znak volá `pop` nad už prázdným polem, což neudělá nic, takže zásobník skončí prázdný a kontrola projde.',
            '`")("` — úvodní `)` odebere z prázdného pole, takže zbyde jen nezapočítaná `(` a zásobník skončí prázdný.',
            '`"(()"` — poslední iterace odebere nespárovanou `(`, takže zásobník skončí prázdný.',
            '`"()()"` — dvě samostatné dvojice se vyruší a kontrolér je nerozezná od jedné vnořené dvojice.',
          ],
          explanation:
            'Na `"())"` drží zásobník jednu `(`, první `)` ho vyprázdní a druhá `)` volá `pop` nad prázdným polem. `Array.prototype.pop` vrátí `undefined` a délku nechá na nule, takže funkce ohlásí vyváženost textu, který vyvážený není. `")("` skončí s `(` v zásobníku, takže vrátí false, což je náhodou správná odpověď. U `"(()"` se ta první `(` nikdy neodebere, protože bez `)` ji z cyklu nic neodstraní, délka je 1 a odpověď je false. `"()()"` opravdu vyvážené je, takže `true` je tam správně. Oprava je vrátit false ve chvíli, kdy přijde `)` a zásobník je prázdný.',
        },
        'dsa-v1-d10-q5': {
          prompt: 'Tohle vyhledávání vrací -1 i pro některé cíle, které v poli jsou. Který popis té chyby je správný?',
          options: [
            'Podmínka cyklu nechá jednoprvkový interval neprozkoumaný: cyklus skončí, jakmile se `low` dostane na `high`, a ten index se nikdy nepřečte.',
            '`Math.floor` zaokrouhluje prostřední index dolů, takže poslední index pole se sudou délkou se nikdy nepřečte.',
            '`high` začíná na `sorted.length - 1`, což je o jedna míň: interval musí sahat až k `sorted.length`.',
            'Test na rovnost běží dřív než test na uspořádání, takže vyhledávání vrátí první shodu, na kterou narazí, místo té nejlevější.',
          ],
          explanation:
            'S `low < high` cyklus skončí ve chvíli, kdy `low === high`, a ten poslední index se nikdy nepřečte. `search([2], 2)` do cyklu vůbec nevstoupí a vrátí -1; `search([1, 3, 5, 7], 7)` se zúží na index 3 a pak skončí. Opraví to podmínka `low <= high`. Zaokrouhlení dolů je pro uzavřený interval v pořádku, protože prostřední index musí padnout jen dovnitř `[low, high]`, a to padne vždycky. `high = sorted.length - 1` je pro uzavřený interval správně; `sorted.length` patří k polootevřené variantě, která jde dohromady s `low < high` a `high = middle`. Poslední možnost popisuje skutečné chování na běhu stejných hodnot, jenže vrátí index uvnitř toho běhu, ne -1, takže o tuhle chybu nejde.',
        },
        'dsa-v1-d10-q6': {
          prompt: 'Vzestupně seřazené pole má 1 000 000 prvků. Kolik jich v nejhorším případě iterativní binární vyhledávání přečte, než může ohlásit, že cíl v poli není?',
          options: ['20', '1 000 000', '1 000', '6'],
          explanation:
            'Každé přiložení zahodí prostřední prvek a aspoň polovinu zbytku, takže po k krocích zbývá nejvýš n / 2ᵏ kandidátů. 2¹⁹ = 524 288 je pod milionem a 2²⁰ = 1 048 576 nad ním, takže 20 kroků stačí a 19 ne. 1 000 000 přečte lineární průchod. 1 000 je odmocnina z milionu a nic v binárním vyhledávání interval takhle nezmenšuje. 6 je log₁₀ 1 000 000, což počítá dělení deseti: změna základu mění jen konstantní násobek ve třídě růstu, ale samotný počet kroků plyne z půlení, takže je základ 2.',
        },
        'dsa-v1-d10-q7': {
          prompt: 'Nějaká rutina je v půlce řazení pole `[5, 3, 8, 1, 9, 2]` a pole teď drží `[1, 3, 5, 8, 9, 2]`. Který algoritmus běží a podle čeho to poznáš?',
          options: [
            'Insertion sort: prvních pět prvků je seřazených a je to přesně prvních pět prvků původního pole, zatímco konec zůstal, kde byl.',
            'Selection sort: nejmenší hodnoty se už přesunuly dopředu.',
            'Merge sort: dvě seřazené poloviny se slily zpátky do pole.',
            'Bubble sort: největší prvek se probublal na konec pole.',
          ],
          explanation:
            'Insertion sort staví seřazenou předponu z prvků, kterými už prošel, a nikdy se nedívá dopředu. `[1, 3, 5, 8, 9]` je přesně `{5, 3, 8, 1, 9}` v jiném pořadí a dvojka pořád sedí tam, kde začala. Selection sort umisťuje zepředu globálně nejmenší hodnoty, takže po dvou průchodech by pole začínalo `1, 2`; dvojka se ale nehnula, takže o něj nejde. Merge sort z této cesty staví nová pole a vrací je, místo aby zapisoval zpátky do vstupu, a `[1, 3, 5, 8, 9]` navíc není slitím seřazených polovin `[3, 5, 8]` a `[1, 2, 9]`. Bubble sort končí každý průchod s největším zbývajícím prvkem úplně vpravo, jenže tady je devítka na indexu 4 a za ní dvojka.',
        },
        'dsa-v1-d10-q8': {
          prompt: 'Tým nahradí ručně psaný `mergeSort(rows, byName)` vestavěným `rows.sort(byName)`. Co se tím doopravdy změní?',
          options: [
            '`rows` se přeuspořádá na místě a `sorted` je tentýž objekt pole, kdežto merge sort nechal `rows` být a vrátil nové pole.',
            'Shodné položky teď můžou vyjít v jiném pořadí, protože `Array.prototype.sort` stabilitu nezaručuje.',
            'Počet porovnání klesne pod n log n, protože engine řadí bez porovnávání prvků.',
            'Pomocná paměť klesne na O(1), protože vestavěné řazení musí řadit na místě.',
          ],
          explanation:
            '`Array.prototype.sort` seřadí pole, nad kterým se volá, a vrátí totéž pole, takže nové pořadí vidí i každá další reference na `rows`. Právě to rozbije volající kód. Stabilita to není: jazyk vyžaduje stabilní `sort` od ES2019, takže řádky se stejným jménem si vzájemné pořadí udrží stejně jako u merge sortu. Porovnávací řazení se obecně pod n log n porovnání nedostane a engine volá `byName` jako každý jiný komparátor. A konstantní pomocná paměť nikde předepsaná není: enginy běžně používají variantu merge sortu, která alokuje O(n).',
        },
        'dsa-v1-d10-q9': {
          prompt:
            'Binární strom je zapsaný jako výpis po hladinách, ve kterém se počítá každá pozice a chybějící uzel je `null`, takže potomci indexu i sedí na 2i + 1 a 2i + 2. Výpis je `[5, 3, 8, null, 4, 7, null]`. Co vrátí inorder průchod?',
          options: ['[3, 4, 5, 7, 8]', '[5, 3, 8, 4, 7]', '[5, 3, 4, 8, 7]', '[4, 3, 7, 8, 5]'],
          explanation:
            'Výpis popisuje 5 v kořeni, 3 vlevo s pravým potomkem 4 a 8 vpravo s levým potomkem 7. Inorder navštíví celý levý podstrom, pak uzel a pak celý pravý podstrom: 3, 4, potom 5, potom 7, 8. Tenhle strom navíc splňuje vlastnost vyhledávacího stromu, takže vzestupný výsledek je potvrzením. `[5, 3, 8, 4, 7]` je samotný výpis bez nullů, tedy průchod po hladinách. `[5, 3, 4, 8, 7]` je preorder, který začíná v kořeni. `[4, 3, 7, 8, 5]` je postorder, který v něm končí.',
        },
        'dsa-v1-d10-q10': {
          prompt:
            'Dvě funkce hledají hodnotu. Jedna prochází binární vyhledávací strom a využívá uspořádání, druhá prochází libovolný binární strom, který žádné uspořádání nenese. Kolik uzlů každá z nich v nejhorším případě přečte ve stromě o n uzlech a výšce h?',
          options: [
            'Průchod vyhledávacím stromem přečte nejvýš h + 1; ten druhý může přečíst všech n, protože bez uspořádání nejde vyloučit ani jeden podstrom.',
            'Obě přečtou nejvýš h + 1, protože každé hledání sestupuje po jedné cestě od kořene k listu.',
            'Průchod vyhledávacím stromem přečte nejvýš log₂ n + 1; ten druhý přečte všech n.',
            'Obě v nejhorším případě přečtou všech n, protože ani jedna nepotvrdí nepřítomnost hodnoty dřív, než uvidí každý uzel.',
          ],
          explanation:
            'Ve vyhledávacím stromě každé porovnání zahodí celý podstrom, takže průchod jde po jedné cestě od kořene k listu a přečte nejvýš h + 1 uzlů, ať hodnotu najde, nebo vypadne pod strom. Bez uspořádání není co zahazovat a nepřítomnost je jistá, až když se prošly všechny uzly. Druhá možnost dává libovolnému stromu záruku, na kterou nemá nárok. Třetí zamění h za log₂ n: obyčejný BST se nikdy nevyvažuje a vkládání vzestupných hodnot z něj udělá řetěz, kde je h rovno n - 1. Čtvrtá ignoruje, co vlastnost vyhledávacího stromu kupuje — právě to, že se nepřítomnost vyřeší v h + 1 čteních.',
        },
      },
    },
    'dsa-v1-d10-record-index': {
      title: 'Prohledatelný index záznamů',
      summary:
        'Obal seřazené pole záznamů do hledání, které zůstane logaritmické, pod dvěma počítanými rozpočty čtení, jež vylučují průchod i předem postavenou kopii.',
      code: {
        prompt:
          '`buildIndex(records)` dostane pole objektů `{ id, name }` už seřazené vzestupně podle `id` a vrátí objekt s jedinou metodou: `lookup(id)`, která vrátí odpovídající objekt záznamu, nebo `null`, když žádný záznam takové id nemá.\n\nIndex si drží pole, které dostal, a hledá v něm; druhou strukturu nestaví. Hodnocení drží nad polem 64 záznamů dva rozpočty. Samotný `buildIndex` smí přečíst nejvýš 2 prvky, takže kopie ani `Map` postavená předem neprojde — postavit ji znamená přečíst všech 64. Každé `lookup` pak smí přečíst nejvýš 20 prvků, což binární vyhledávání zvládne se sedmi a lineární průchod nezvládne vůbec.\n\n`buildIndex([])` pořád vrátí funkční index a každé hledání v něm dá `null`. Id menší než nejmenší, větší než největší i takové, které padne mezi dva sousedy, dají `null` taky.',
        contract: [
          'Vrať objekt s metodou `lookup(id)`; `lookup` vrací objekt záznamu, ne jeho jméno a ne jeho index.',
          '`buildIndex` přečte nejvýš 2 prvky pole: drž si referenci, nekopíruj ho a neindexuj ho do Map.',
          'Každé `lookup` přečte nejvýš 20 prvků z pole o 64 prvcích, což vylučuje průchod.',
          'Chybějící id dá `null`, i u indexu postaveného z prázdného pole.',
          'Pole záznamů nech, jak jsi ho našel: neřaď, nepřepisuj, nic z něj neodebírej.',
        ],
        hints: [
          'Nech si pole záznamů v uzávěru a napiš `lookup` jako binární vyhledávání nad ním. Při vytváření indexu se nemusí stavět nic, a přesně to hlídá rozpočet pro stavbu.',
          'Uzavřený interval tu funguje: `low` na 0, `high` na `records.length - 1` a cyklus, dokud je `low` menší nebo rovno `high`. Porovnávej `records[middle].id` s hledaným id.',
          'Přečti `records[middle]` do lokální proměnné jednou za iteraci. Dvojí čtení se do dvaceti pořád vejde, ale jedna proměnná dělá trojí porovnání čitelnějším.',
        ],
        approach: [
          'Vrať objekt, jehož `lookup` uzavírá pole `records`, a při stavbě toho objektu se pole nedotýkej.',
          'Uvnitř `lookup` nastav `low` na 0 a `high` na poslední index.',
          'Dokud je `low` menší nebo rovno `high`, vezmi prostřední index se zaokrouhlením dolů a přečti ten záznam.',
          'Vrať záznam, když jeho id sedí; jinak posuň `low` za prostřední index při menším id, nebo stáhni `high` pod něj při větším.',
          'Až je interval prázdný, vrať `null` — tím je pokrytý i index postavený z prázdného pole.',
        ],
        criteria: [
          {
            label: 'Správný záznam nebo null včetně krajních případů',
            detail: 'Zkontroluj index postavený z prázdného pole, jediný záznam, id pod nejmenším, id nad největším a id, které padne mezi dva sousedy.',
          },
          {
            label: 'Logaritmické hledání a nic postaveného předem',
            detail:
              'Jeden ze dvou rozpočtů čtení byl překročen. Průchod polem uvnitř `lookup` překročí rozpočet 20 na jedno hledání; kopie záznamů nebo jejich zaindexování do Map uvnitř `buildIndex` překročí rozpočet 2 pro stavbu.',
          },
        ],
        testLabels: [
          '',
          'pod, mezi i nad dají null',
          'index postavený z prázdného pole nic nenajde',
          'jediný záznam',
          'čtyři hledání v 64 záznamech, jedno z nich chybějící',
          'čtyři hledání přečtou každé nejvýš dvacet záznamů',
          'stavba indexu skoro nic nepřečte',
        ],
      },
    },
    'dsa-v1-d10-repair-traversal': {
      title: 'Oprav průchod po hladinách',
      summary: 'Starter prochází strom do hloubky a spadne na chybějícím potomkovi. Oprav všechny tři vady, ať se hodnoty vrací po hladinách.',
      code: {
        prompt:
          '`levelOrder` ve starteru je schválně rozbitý a úkolem je ho opravit. Když funguje, vrátí `levelOrder(root)` hodnoty binárního stromu hladinu po hladině a zleva doprava uvnitř každé hladiny.\n\nUzel je obyčejný objekt `{ value, left, right }`, chybějící potomek je `null` a strom je jeho kořen, nebo `null`, když je prázdný. `levelOrder(null)` vrátí `[]` a jediný uzel vrátí jednoprvkové pole.\n\nVady jsou tři. Ze seznamu čekajících se bere zezadu přes `pop`, což dá pořadí do hloubky místo po hladinách. Do seznamu se přidávají i chybějící potomci, takže některá další iterace čte `value` z `null` a spadne. A u prázdného stromu se `null` dostane do seznamu ještě před začátkem cyklu. Oprav všechny tři; klidně funkci přepiš celou.',
        contract: [
          'Vracej pole hodnot, hladinu po hladině a zleva doprava uvnitř každé hladiny.',
          'Ber další uzel ze začátku seznamu čekajících, ne z konce: braní z konce je právě to, co dělá průchod do hloubky.',
          'Přidávej jen potomky, kteří nejsou `null`, a pro prázdný strom vracej `[]`.',
          'Strom nech beze změny a při každém volání vrať nové pole.',
        ],
        hints: [
          'Fronta se čte zepředu. Drž si index `head` do pole `queue`, čti `queue[head]` a pak `head` posuň. Vyhneš se tím volání `shift`, které při každém zavolání posune všechny zbývající prvky o místo níž.',
          'Ošetři každého potomka testem `!== null` ještě před přidáním a cyklus na chybějící uzel nikdy nenarazí.',
          'Prázdný strom vyřeš před cyklem. Vrátit rovnou `[]` je jednodušší než učit cyklus přeskakovat `null` v kořeni.',
        ],
        approach: [
          'Když je kořen `null`, vrať rovnou `[]`.',
          'Naplň frontu kořenem a drž si index `head` začínající na 0.',
          'Dokud je `head` menší než `queue.length`, přečti `queue[head]` a posuň `head` o jedna.',
          'Zapiš hodnotu toho uzlu a pak přidej jeho levého a pravého potomka, každého jen tehdy, když není `null`.',
          'Až `head` přejde konec fronty, vrať posbírané hodnoty.',
        ],
        testLabels: [
          'plný třípatrový strom',
          'chybějící potomek neposune zbytek hladiny',
          'prázdný strom dá prázdné pole',
          'jediný uzel',
          'řetěz doleva, jeden uzel na hladinu',
          'uzel, jehož jediný potomek je vpravo',
          'strom se vrátí beze změny',
        ],
      },
    },
    'dsa-v1-d10-frequency-index': {
      title: 'Spočítej jednou, odpověz mnohokrát',
      summary: 'Odpověz na čtyřicet dotazů nad padesáti hodnotami v rozpočtu čtení, do kterého se průchod na každý dotaz nevejde.',
      code: {
        prompt:
          '`mostFrequent(values, queries)` dostane pole hodnot a pole dotazovaných hodnot a vrátí pole počtů: jeden na každý dotaz, ve stejném pořadí, který říká, kolikrát se ta hodnota vyskytuje v `values`.\n\n`mostFrequent(["a", "b", "a", "c", "a"], ["a", "c", "z"])` dá `[3, 1, 0]`. Dotazovaná hodnota, která se nevyskytuje, dá 0. Prázdné pole `queries` dá `[]`, prázdné pole `values` dá nulu na každý dotaz a opakovaný dotaz dostane svůj vlastní počet pokaždé. Hodnoty si drží typ: číslo `1` a řetězec `"1"` jsou různé hodnoty a počítají se zvlášť.\n\nOdpovídat na každý dotaz vlastním průchodem funguje a na hodnoceném vstupu to přečte 40 × 50 = 2000 prvků. Spočítat každou hodnotu jednou předem a pak z toho odpovídat přečte 50. Hodnocení počítá čtení prvků pole `values` za celé volání a povoluje nejvýš 200 pro 40 dotazů nad 50 hodnotami.',
        contract: [
          'Vrať nové pole s jedním počtem na dotaz, v pořadí, v jakém dotazy přišly.',
          'Počítej každou hodnotu podle její vlastní identity: `1` a `"1"` jsou dvě různé hodnoty.',
          'Přečti za celé volání nejvýš 200 prvků pole `values`; hodnocený vstup je 40 dotazů nad 50 hodnotami, takže průchod na každý dotaz se nevejde.',
          'Obě vstupní pole nech, jak jsi je našel.',
        ],
        hints: [
          'Projdi `values` jednou a postav Map z každé hodnoty na její počet. Potom se dotazy pole `values` už nedotknou, a přesně o to v rozpočtu čtení jde.',
          'Map drží `1` a `"1"` odděleně. Obyčejný objekt z obou klíčů udělá řetězec `"1"` a oba počty slije dohromady.',
          '`counts.get(query)` je pro hodnotu, která se nevyskytla, `undefined`, takže než ji dáš do výsledku, nahraď ji nulou.',
        ],
        approach: [
          'Vytvoř prázdnou Map pro počty.',
          'Projdi `values` jednou a u každé hodnoty ulož její dosavadní počet plus jedna, přičemž chybějící záznam ber jako nulu.',
          'Projdi `queries` v pořadí a každý dotaz z Map přečti.',
          'Když Map pro ten dotaz nic nedrží, použij 0.',
          'Vrať pole počtů, které je stejně dlouhé jako `queries`.',
        ],
        criteria: [
          {
            label: 'Správné počty včetně krajních případů',
            detail: 'Zkontroluj prázdné pole hodnot, prázdné pole dotazů, dotaz, který se nevyskytuje, opakovaný dotaz a hodnoty, které se liší typem, ale textem vypadají stejně.',
          },
          {
            label: 'Jeden průchod hodnotami bez ohledu na počet dotazů',
            detail: 'Počítadlo čtení překročilo 200 pro 40 dotazů nad 50 hodnotami. Průchod polem `values` uvnitř cyklu přes dotazy spadne sem i tehdy, když jsou všechny počty správně.',
          },
        ],
        testLabels: [
          '',
          'žádné hodnoty dají nulu na každý dotaz',
          'žádné dotazy dají prázdné pole',
          'opakovaný dotaz se zodpoví dvakrát',
          'číslo 1 a řetězec "1" jsou různé hodnoty',
          'nula je obyčejná hodnota, ne chybějící',
          'čtyřicet dotazů nad padesáti hodnotami přečte nejvýš dvě stě prvků',
        ],
      },
    },
  },
};
