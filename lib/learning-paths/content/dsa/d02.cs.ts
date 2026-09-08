/** Czech copy for D02. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D02_CS: ModuleCs = {
  title: 'Pole a řetězce',
  outcomes: [
    'Říct, co která operace nad polem stojí a proč je začátek pole drahý a konec ne.',
    'Vědomě se rozhodnout mezi změnou pole na místě a vrácením nového pole a ten kontrakt pojmenovat.',
    'Vyřešit úlohu se dvěma ukazateli — od krajů dovnitř nebo se čtecím a zápisovým indexem — jedním průchodem a v konstantní pomocné paměti.',
  ],
  lessons: {
    'dsa-v1-d02-l1': {
      title: 'Indexování, průchod a co stojí změna',
      summary: 'Čtení podle pozice, průchod celým polem, změna na místě proti postavení nového pole a skutečná cena push, pop, shift, unshift, slice a splice.',
      sections: [
        {
          body:
            'Pole je očíslovaná řada přihrádek a číslo je adresa. `values[3]` jde rovnou do čtvrté přihrádky, aniž by se podíval na tři před ní, takže přečtení nebo zápis jednoho prvku se v nákladovém modelu této cesty počítá jako jeden krok. Na téhle jediné vlastnosti stojí všechny techniky v tomto modulu.',
        },
        {
          body:
            'Druhá polovina je průchod. `for…of` postupně naváže každý prvek, indexový cyklus dá navíc i pozici a oba navštíví n prvků v n krocích. Po indexovém cyklu sáhni vždycky, když jde o pozici: při porovnávání sousedů, při zápisu zpátky do pole nebo při chůzi od obou krajů dovnitř.',
        },
        { caption: 'Tři průchody týmž polem: jen prvek, prvek s pozicí a odzadu dopředu.' },
        {
          body:
            'Pole se dá změnit dvěma způsoby a každý slibuje volajícímu něco jiného. Zápis `values[i] = next` změní pole, které volající pořád drží. `map`, `filter`, `slice` a rozbalení to pole nechají být a vrátí druhé. Po prvním druhu volání ukazuje proměnná volajícího na jiná data, po druhém ne.',
        },
        { caption: 'Dvě funkce, které vypíšou stejná čísla a o vstupu slibují pravý opak.' },
        {
          caption: 'Totéž zdvojnásobení oběma způsoby, s výpisem toho, co se stane s předaným polem.',
          note: 'Prohoď obě volání a uvidíš, jak druhé začíná tam, kde první skončilo.',
        },
        {
          body:
            'Pojmenuj, kterou z nich jsi napsal. `sortInPlace` a `sortedCopy` nestojí nic navíc a ušetří každému dalšímu čtenáři otevírání těla funkce. Funkce, která mění svůj argument, ho podle zvyklosti taky vrací — přesně to dělá `Array.prototype.reverse` i `Array.prototype.sort` — takže návratová hodnota je pohodlí, ne kopie.',
        },
        {
          body:
            'Kde pole měníš, rozhoduje o tom, co ta změna stojí. `push` a `pop` pracují na konci, kde se žádný jiný prvek hýbat nemusí. `shift` a `unshift` pracují na začátku a každý prvek za tím, na který saháš, skončí na jiném indexu, takže engine musí přepsat všechny.',
        },
        {
          caption: 'Co která operace stojí nad polem o n prvcích v jednotkovém nákladovém modelu této cesty.',
          headers: ['Operace', 'Náklady', 'Proč'],
          rows: [
            ['`push(value)`', 'Amortizovaně O(1)', 'Zapíše jednu přihrádku za konec; občasné zvětšení pole se rozpustí mezi mnoho volání'],
            ['`pop()`', 'O(1)', 'Zahodí poslední přihrádku, takže nic jiného nemění index'],
            ['`shift()`', 'O(n)', 'Každý zbývající prvek se posune o index níž'],
            ['`unshift(value)`', 'O(n)', 'Každý existující prvek se posune o index výš, aby se uvolnila přihrádka 0'],
            ['`slice(from, to)`', 'O(k) pro k zkopírovaných prvků', 'Alokuje nové pole a zkopíruje do něj daný úsek'],
            ['`splice(i, count)`', 'O(n − i)', 'Odebere na místě a pak posune celý zbytek dolů, aby zacelil díru'],
            ['`indexOf(value)`', 'O(n)', 'Prochází od začátku, dokud něco nesedí'],
            ['`concat(other)` a `[...values]`', 'O(n)', 'Obojí alokuje nové pole a zkopíruje do něj každý prvek'],
          ],
        },
        {
          body:
            'Ty lineární si zaslouží bližší pohled, protože místo volání tu práci schová. `queue.shift()` je pár znaků a až n − 1 zápisů. Nic v zápisu to nenaznačí, a právě proto se propašuje do cyklů, které pak běží v kvadratickém čase.',
        },
        {
          caption: 'Odebrání prvního prvku z pětiprvkového pole: čtyři prvky se posunou, aby jeden mohl odejít.',
          notes: [
            'Pět prvků. `shift` musí odebrat ten na indexu 0, což znamená, že každý pozdější prvek musí skončit o index níž.',
            '„b“ se zkopíruje z indexu 1 dolů na index 0. Jeden zápis — a kopie, která pořád leží na indexu 1, je od teď neplatná.',
            '„c“ se posune z indexu 2 na index 1. Dva zápisy.',
            '„d“ se posune z indexu 3 na index 2. Tři zápisy.',
            '„e“ se posune z indexu 4 na index 3. Čtyři zápisy a poslední přihrádka je teď duplikát.',
            'Duplicitní přihrádka zmizí a délka klesne na čtyři. Jedno odebrání stálo čtyři přesuny, takže `shift` nad n-prvkovým polem udělá zhruba n zápisů.',
          ],
          counterLabels: ['Zápisy', 'Zápisy', 'Zápisy', 'Zápisy', 'Zápisy', 'Zápisy'],
        },
        {
          body:
            'Vyprázdnit frontu pomocí `while (queue.length > 0) out.push(queue.shift())` se čte hezky a stojí O(n²). První shift posune n − 1 prvků, druhý n − 2 a celá ta řada dá dohromady zhruba n²/2. Drž si místo toho index hlavy a posouvej ho dopředu, nebo pole vyprazdňuj od konce pomocí `pop`, když na pořadí nezáleží.',
        },
        {
          body:
            'Řetězce se na místě změnit nedají vůbec. Přiřazení do `text[0]` ve striktním režimu vyhodí výjimku a v nestriktním neudělá nic, a každá metoda, která vypadá jako úprava — `slice`, `replace`, `toUpperCase` — vrátí nový řetězec a původní nechá být. Skládání řetězce pomocí `result += character` v cyklu alokuje při každém průchodu nový řetězec, takže je kvadratické vůči výsledné délce.',
        },
        {
          body:
            'Číst řetězec je ale levné. `text[i]` a `text.length` jsou jediné dvě věci, které funkce se dvěma ukazateli nad řetězcem potřebuje, a ani jedna nic nealokuje. Právě proto má kontrola palindromu z další lekce konstantní pomocnou paměť, aniž by se o to musela snažit.',
        },
        {
          body:
            'Jedna výhrada se táhne z D01. Pole je v JavaScriptu objekt s délkou a číselnými klíči a engine si podle toho, co do něj dáš, vybírá z několika vnitřních reprezentací. Počítat čtení podle indexu jako jeden krok je výukový model, který pro hustá číselná pole z tohoto modulu dobře platí; není to slib o rozložení paměti.',
        },
      ],
    },
    'dsa-v1-d02-l2': {
      title: 'Dva ukazatele a kam se poděje paměť',
      summary: 'Chůze od krajů dovnitř, zhuštění se čtecím a zápisovým indexem a rozdíl v pomocné paměti mezi změnou pole a vrácením nového.',
      sections: [
        {
          body:
            'Dva ukazatele jsou jedna myšlenka ve dvou podobách. Drž si dva indexy do téže posloupnosti, posouvej je podle pravidla, které ani jeden nikdy nepustí zpátky, a otázka, která vypadá na všechny dvojice, se smrskne na jediný průchod.',
        },
        {
          body:
            'První podoba začíná na krajích a jde dovnitř: `left` na 0, `right` na `length - 1`, oba se přibližují, dokud se nepotkají. Otočení pole, kontrola palindromu i hledání dvojice s daným součtem v seřazeném poli do ní patří.',
        },
        { caption: 'Každý krok natrvalo vyřadí jeden index, takže n − 1 kroků nahradí n²/2 dvojic, které by prošel dvojitý cyklus.' },
        {
          body:
            'Legální je to díky seřazení. Když je součet moc malý, nejmenší prvek nemůže být součástí žádné dvojice, která by na cíl dosáhla, takže posunutím `left` nepřijdeš o nic užitečného. Když je součet moc velký, platí totéž pro `right`. Odeber seřazení a ta chůze přestane být správná.',
        },
        {
          caption: 'Kontrola slova „level“ od obou krajů: pět znaků, dvě porovnání.',
          notes: [
            '`left` startuje na indexu 0 a `right` na indexu 4, tedy na obou koncích slova „level“. Zatím se nic neporovnávalo.',
            'Porovnej „l“ s „l“. Shodují se, takže `left` jde na 1 a `right` na 3.',
            'Porovnej „e“ s „e“. Taky se shodují, takže `left` jde na 2 a `right` na 2.',
            '`left` a `right` se potkaly na indexu 2. Osamělý prostřední znak nemá s čím být porovnán, takže cyklus končí a odpověď je true: pět znaků stálo dvě porovnání.',
          ],
          counterLabels: ['Porovnání', 'Porovnání', 'Porovnání', 'Porovnání'],
        },
        {
          body:
            'Tělo cyklu proběhne zhruba n/2 krát a n/2 je konstantní násobek n, takže třída růstu je O(n). Poloviční počet iterací se na reálném vstupu vyplatí, ale funkci do menší rodiny nepřesune.',
        },
        {
          body:
            'Druhá podoba postaví oba ukazatele na začátek a nechá jeden běžet napřed. Čtecí ukazatel navštíví každý prvek, zápisový se pohne jen tehdy, když si prvek místo ve výsledku zasloužil. Vyhazování duplicit, vyhazování nul, ponechání všeho, co projde testem — celá tahle skupina úloh je jediná podoba.',
        },
        { caption: 'Zhuštění na místě: odpovědí je, kam došel zápisový ukazatel, ne nové pole.' },
        {
          body:
            'Smysl mají potom jen přihrádky pod vrácenou délkou. `removeZeros([0, 4, 0, 5])` vrátí 2 a v poli nechá `[4, 5, 0, 5]`, kde koncová `0` a druhá `5` jsou zbytky, které nikdo neuklidil. Napiš to do kontraktu funkce a nikdy nečti za délku, kterou ti vrátila.',
        },
        {
          caption: 'Táž práce dvěma způsoby a co každý z nich stojí volajícího.',
          headers: ['Otázka', 'Změna na místě', 'Vrácení nového pole'],
          rows: [
            ['Pomocná paměť', 'O(1): pár indexů a jedna odložená hodnota', 'O(n): druhé pole stejně dlouhé jako vstup'],
            ['Pole, které volající předal', 'Drží nový obsah', 'Zůstane nedotčené'],
            ['Kdokoli další, kdo to pole drží', 'Změnu uvidí, ať o ni stál nebo ne', 'Neuvidí nic'],
            ['Co se vrátí', 'Totéž pole, nebo počet', 'Nové pole'],
            ['Kdy po tom sáhnout', 'Velké vstupy, jeden jasný vlastník, zdokumentovaná mutace', 'Sdílená data, krok zpět, cokoli se čte souběžně'],
          ],
        },
        {
          body:
            'Celková paměť počítá i vstup, takže každá funkce nad n-prvkovým polem je celkově O(n). Pomocná paměť je to číslo, které ty dva sloupce odděluje: otočení od krajů dovnitř alokuje dva indexy a jednu odloženou hodnotu a zůstane na O(1) bez ohledu na n, kdežto rozbalení pole do kopie a otočení té kopie alokuje celé druhé pole.',
        },
        {
          body:
            'Funkce, která mění svůj argument, má vedlejší účinek, který její signatura nikde neukazuje. Dej jí jméno, které se k tomu přizná, zdokumentuj, jak pole vypadá po návratu, a rozhodni se záměrně, jestli vrátíš pole, počet, nebo nic.',
        },
        {
          body:
            'U řetězců za tebe rozhodnutí padne samo. Otočit řetězec na místě nejde, takže chůze od krajů dovnitř nad řetězcem jenom čte: dva indexy, `text[left]`, `text[right]`, žádná alokace, O(1) pomocné paměti. Otočit kopii a porovnat je taky správně a cestou k témuž booleanu to alokuje pole znaků, otočené pole a nový řetězec.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d02-l1-read': {
      title: 'Čtení: indexování, průchod a co stojí změna',
      summary: 'Pozice jako adresa, tři podoby průchodu, mutace proti kopírování a tabulka nákladů běžných operací nad polem.',
    },
    'dsa-v1-d02-l2-read': {
      title: 'Čtení: dva ukazatele a kam se poděje paměť',
      summary: 'Chůze od krajů dovnitř i se čtecím a zápisovým indexem, nespecifikovaný zbytek po zhuštění a pomocná paměť na místě proti kopii.',
    },
    'dsa-v1-d02-checks': {
      title: 'Kontrola nákladů a mutace polí',
      summary: 'Čtyři otázky nad novými ukázkami: co volání udělalo s polem volajícího, cena shiftu v cyklu, pomocná paměť chůze na místě a počet porovnání v kontrole palindromu.',
      questions: {
        'dsa-v1-d02-q1': {
          prompt: 'Co bude v `numbers` po doběhnutí této ukázky a které volání to změnilo?',
          options: [
            '`[2, 3]` — `trimFirst` změnil pole volajícího a `withoutFirst` postavil samostatné',
            '`[1, 2, 3]` — obě funkce vrátily nová pole a vstup nechaly být',
            '`[3]` — obě volání odebrala prvek z pole volajícího',
            '`[2, 3]` — odebrání provedl `withoutFirst` a `trimFirst` po sobě nic nezanechal',
          ],
          explanation:
            '`shift` odebírá z pole, nad kterým je zavolaný, takže `trimFirst` nechá v `numbers` `[2, 3]`. `slice` alokuje nové pole a zkopíruje do něj úsek, takže `withoutFirst` vrátí `[3]` a nic nezmění; tady se jeho výsledek zahodí. `[1, 2, 3]` by platilo, jen kdyby kopírovala obě volání. `[3]` by vyžadovalo, aby obě volání vstup měnila. Poslední možnost trefí hodnotu ze špatného důvodu, a přesně na tom důvodu záleží, až budeš předpovídat, co volání udělá.',
        },
        'dsa-v1-d02-q2': {
          prompt: '`queue` má na začátku n prvků. Jaká je nejtěsnější třída růstu pro dobu běhu funkce `drain`?',
          options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'],
          explanation:
            'Každý `shift` posune každý zbývající prvek o index níž, takže první stojí zhruba n zápisů, druhý zhruba n − 1 a celá řada dá dohromady asi n²/2 — kvadratická rodina. O(n) by platilo, kdyby odebrání ze začátku bylo konstantní, což není; `push` amortizovaně konstantní opravdu je, takže vyprazdňování od konce pomocí `pop` by O(n) bylo. Nic se tu nepůlí, takže žádný logaritmický činitel nevzniká, a cyklus proběhne n krát, takže konstantní to být nemůže.',
        },
        'dsa-v1-d02-q3': {
          prompt: 'Jaká je pro pole délky n pomocná paměť — paměť použitá nad rámec samotného vstupu — funkce `reverseSection`?',
          options: [
            'O(1) — dva indexy a jedna odložená hodnota, ať je n jakékoli',
            'O(n) — pole, které vrací, je stejně dlouhé jako vstup',
            'O(n) — každá výměna potřebuje dočasnou kopii pole',
            'O(log n) — oba ukazatele se potkají zhruba po log n krocích',
          ],
          explanation:
            'Funkce zapisuje do pole, které dostala, a alokuje tři lokální proměnné, jejichž počet s n neroste. Vrácení `values` nealokuje nic: vrací totéž pole, které volající už měl, takže návratová hodnota pomocnou paměť nezvyšuje. Výměna potřebuje jednu odloženou hodnotu, ne kopii pole. A ukazatele se v každé iteraci posunou o krok a potkají se zhruba po n/2 krocích — nic se nepůlí, takže žádný logaritmus.',
        },
        'dsa-v1-d02-q4': {
          prompt: 'Kolik porovnání znaků udělá `isPalindrome(\'abcdcba\')`, než se vrátí?',
          options: ['3', '4', '6', '7'],
          explanation:
            'Porovnají se dvojice (0, 6), (1, 5) a (2, 4). Po třetí shodě stojí oba ukazatele na indexu 3, `left < right` neplatí a cyklus končí, takže tři porovnání. 4 by zahrnovalo prostřední znak sám se sebou, což podmínka `left < right` vylučuje. 6 počítá každý znak kromě prostředního, čímž započítá každou dvojici dvakrát. 7 je jedno porovnání na znak, což stojí verze s otočenou kopií — ne chůze od krajů dovnitř.',
        },
      },
    },
    'dsa-v1-d02-reverse-in-place': {
      title: 'Otočení na místě',
      summary: 'Otoč pole výměnami od obou krajů dovnitř a vrať přesně to pole, které jsi dostal.',
      code: {
        prompt:
          'Napiš funkci `reverseInPlace(values)`. Otočí pole na místě a vrátí totéž pole. `reverseInPlace([1, 2, 3, 4])` dá `[4, 3, 2, 1]` a pole, které volající předal, drží potom `[4, 3, 2, 1]`. Prázdné pole i jednoprvkové pole se vrátí beze změny.\n\nCvičení je právě ten kontrakt o mutaci. Kontrolují ho dvě hodnocené podmínky: pole volajícího musí po volání držet otočené pořadí a hodnota, kterou vrátíš, musí být tentýž objekt, ne jeho otočená kopie. Třetí počítá zápisy podle indexu a povoluje nejvýš jeden na prvek.\n\n`Array.prototype.reverse` tohle všechno umí. Napiš si cyklus s výměnami sám — trénink je právě v té práci s ukazateli a v odložené hodnotě.',
        contract: [
          'Otoč pole, které jsi dostal; nestav druhé.',
          'Vrať totéž pole, aby platilo `reverseInPlace(values) === values`.',
          'Hodnocený rozpočet je nejvýš jeden zápis podle indexu na prvek.',
          'Prázdné pole i jednoprvkové pole se vrací beze změny a pořád jako tentýž objekt.',
        ],
        hints: [
          'Dej po jednom indexu na každý konec. Vyměň, na co ukazují, pak posuň `left` o jedna nahoru a `right` o jedna dolů a skonči, jakmile se potkají nebo překříží.',
          'Výměna potřebuje, kam si první hodnotu odložit, než ji přepíšeš: nejdřív `const held = values[left]`, pak obě přiřazení.',
          'Prázdné pole ani jednoprvkové pole do cyklu vůbec nevstoupí, protože `left` hned na začátku není pod `right`. Vrácení `values` dá u obou správnou odpověď.',
        ],
        approach: [
          'Nastav `left` na 0 a `right` na `values.length - 1`.',
          'Dokud je `left` pod `right`, vyměň `values[left]` a `values[right]` pomocí jedné dočasné proměnné.',
          'Po každé výměně posuň `left` o jedna nahoru a `right` o jedna dolů.',
          'Vrať samotné `values`, aby volající dostal zpátky pole, které předal.',
        ],
        criteria: [
          {
            label: 'Správné otočené pořadí včetně krajních případů',
            detail: 'Zkontroluj prázdné pole, jeden prvek, sudou délku a lichou délku, kde prostřední prvek zůstane na místě.',
          },
          {
            label: 'Otočeno na místě a vráceno totéž pole',
            detail: 'Pole volajícího musí po volání držet otočené pořadí, návratová hodnota musí být tentýž objekt a počítadlo zápisů musí zůstat v rozpočtu jednoho zápisu na prvek. Otočená kopie tady propadne, i když má správný obsah.',
          },
        ],
        testLabels: [
          '',
          'lichá délka nechá prostřední prvek tam, kde je',
          'prázdné pole se vrátí prázdné',
          'jeden prvek je sám sobě otočením',
          'změnilo se to pole, které volající předal',
          'vrácená hodnota je totéž pole, ne kopie',
          'šest prvků stojí nejvýš šest zápisů podle indexu',
        ],
      },
    },
    'dsa-v1-d02-palindrome-two-pointer': {
      title: 'Palindrom od obou krajů',
      summary: 'Projdi řetězec od obou krajů dovnitř a rozhodni, jestli se čte stejně pozpátku — bez kopie a bez jakékoli normalizace.',
      code: {
        prompt:
          'Napiš funkci `isPalindrome(text)`, která vrátí `true`, když se řetězec čte stejně pozpátku, a `false`, když ne.\n\nVstup obsahuje jen ASCII písmena a číslice: žádné mezery, interpunkci, diakritiku ani nic dalšího k přeskočení. Porovnání rozlišuje velikost písmen a nedochází k žádné normalizaci, takže `isPalindrome(\'Racecar\')` je `false`, protože velké `R` není malé `r`. Vstup nepřeváděj na malá ani velká písmena, nic z něj neodstraňuj a nijak ho nepřepisuj.\n\n`isPalindrome(\'\')` je `true` a `isPalindrome(\'x\')` je `true`: prázdný řetězec ani jediný znak nemají čím sami sobě odporovat. Použij dva indexy jdoucí dovnitř a vrať se hned, jakmile se nějaká dvojice neshodne.',
        contract: [
          'Vstup obsahuje jen ASCII písmena a číslice, takže není co přeskakovat.',
          'Porovnávej znaky přesně: bez převodu na malá či velká písmena a bez normalizace.',
          'Prázdný řetězec i libovolný jediný znak jsou palindromy.',
          'Vrať boolean, ne jen hodnotu, která se chová jako pravdivá.',
        ],
        hints: [
          'Řetězec se indexuje stejně jako pole: `text[left]` dá jeden znak a `text.length` dá jejich počet.',
          'Vrať `false` přímo z cyklu, jakmile se dvojice liší. Když cyklus doběhne a k tomu nedojde, shodly se všechny dvojice a odpověď je `true`.',
          'U liché délky skončí oba ukazatele na stejném prostředním indexu a cyklus tam zastaví, což je správně: znak se sobě samému vždycky rovná.',
        ],
        approach: [
          'Nastav `left` na 0 a `right` na `text.length - 1`.',
          'Dokud je `left` pod `right`, porovnej `text[left]` s `text[right]`.',
          'Jakmile se liší, vrať rovnou `false`.',
          'Jinak posuň `left` o jedna nahoru a `right` o jedna dolů.',
          'Až se ukazatele potkají nebo překříží, vrať `true`.',
        ],
        testLabels: [
          '',
          'vnější dvojice se shoduje, vnitřní ne',
          'sudá délka nemá prostřední znak',
          'prázdný řetězec je palindrom',
          'jediný znak je palindrom',
          'rozlišuje velikost písmen: velké R se nerovná malému r',
          'číslice jsou znaky jako každé jiné',
        ],
      },
    },
    'dsa-v1-d02-dedupe-sorted': {
      title: 'Zhuštění seřazeného pole',
      summary: 'Vyhoď duplicity ze vzestupně seřazeného pole čtecím a zápisovým ukazatelem a vrať, kolik různých hodnot zbylo.',
      code: {
        prompt:
          'Napiš funkci `removeDuplicatesSorted(sorted)`. Argumentem je pole čísel seřazené vzestupně, případně s opakováním. Přesuň různé hodnoty na začátek téhož pole, v pořadí, a vrať, kolik jich je. `removeDuplicatesSorted([1, 1, 2, 3, 3, 3, 4])` vrátí 4 a v prvních čtyřech přihrádkách nechá `1, 2, 3, 4`.\n\nVšechno od vrácené délky dál je nespecifikované. Ať tam zbyde cokoli, žádná podmínka se na to nedívá a volající by se tam taky dívat neměl.\n\nPrázdné pole vrátí 0. Pole, jehož hodnoty jsou všechny stejné, vrátí 1. Protože je vstup seřazený, stejné hodnoty spolu vždycky sousedí, takže jeden čtecí a jeden zápisový ukazatel stačí — hodnocený rozpočet je nejvýš jeden zápis podle indexu na prvek, což vylučuje mazání duplicit opakovaným voláním `splice`.',
        contract: [
          'Vstup je seřazený vzestupně, takže stejné hodnoty leží vedle sebe; spolehni se na to.',
          'Zapiš různé hodnoty na začátek pole, které jsi dostal, ve vzestupném pořadí.',
          'Vrať počet různých hodnot jako číslo.',
          'Přihrádky od vrácené délky dál jsou nespecifikované a nikdy se nekontrolují.',
          'Hodnocený rozpočet je nejvýš jeden zápis podle indexu na prvek.',
        ],
        hints: [
          'První prvek si místo drží vždycky, takže začni zápisový i čtecí ukazatel na 1.',
          'Porovnávej `sorted[read]` s `sorted[write - 1]`, tedy s poslední ponechanou hodnotou. Když se liší, zapiš `sorted[read]` do `sorted[write]` a posuň zápisový ukazatel.',
          'Prázdné pole se k cyklu vůbec nedostane; vrať 0 dřív. Každé jiné pole si nechá aspoň svůj první prvek, a proto pole se samými stejnými hodnotami vrátí 1.',
        ],
        approach: [
          'U prázdného pole vrať rovnou 0.',
          'Ber první prvek jako ponechaný, takže zápisový ukazatel začíná na 1.',
          'Veď čtecí ukazatel od indexu 1 až na konec.',
          'Když se prvek na čtecím ukazateli liší od poslední ponechané hodnoty, zkopíruj ho do zápisové přihrádky a posuň zápisový ukazatel o jedna.',
          'Vrať zápisový ukazatel — to je počet různých hodnot, které teď leží na začátku pole.',
        ],
        criteria: [
          {
            label: 'Správný počet různých hodnot',
            detail: 'Zkontroluj prázdné pole, pole jedné opakované hodnoty, pole bez duplicit a záporné hodnoty.',
          },
          {
            label: 'Zhuštěno do pole volajícího, v rámci rozpočtu zápisů',
            detail: 'Různé hodnoty musí skončit na začátku pole, které bylo předáno, a počítadlo zápisů musí zůstat v rozpočtu jednoho zápisu na prvek. Postavení samostatného pole různých hodnot i mazání duplicit opakovaným voláním `splice` tady propadne.',
          },
        ],
        testLabels: [
          '',
          'bez duplicit se počet nemění',
          'prázdné pole nemá žádné různé hodnoty',
          'jedna hodnota čtyřikrát za sebou se smrskne na jednu',
          'záporná čísla a nula jsou běžné hodnoty',
          'první čtyři přihrádky pole volajícího drží různé hodnoty',
          'deset prvků stojí nejvýš deset zápisů podle indexu',
        ],
      },
    },
  },
};
