// Czech copy for lib/coding/tasks/react.ts, keyed by task id. Arrays align by
// index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

const JSONPLACEHOLDER_NOTE = 'Veřejné cvičné API JSONPlaceholder. Nepotřebuje API klíč.';
const JSONPLACEHOLDER_WRITE_NOTE = 'JSONPlaceholder cvičné zápisy přijme, ale trvale je neuloží.';
const CAPSTONE_HINT =
  'Nejdřív napiš do komentářů krátký plán toku dat. Postav GET a vykreslení, potom interakce, potom POST, potom stavy načítání a chyby. Nakonec vysvětli úložiště, hranice API, zpracování selhání a škálování.';

export const REACT_TASKS_CS: Record<string, CodingTaskCs> = {
  'react-color-selector': {
    title: 'Výběr barvy',
    prompt:
      'Vykresli select s barvami deklarovanými ve startovním kódu — Red, Blue a Green — a k němu řádek „You have selected: <barva>“. Na začátku je vybraná první barva a výběr jiné řádek hned přepíše.',
    hints: ['Vybranou barvu drž ve stavu a selectu nastav value i onChange.'],
    approach: [
      'Zvolenou barvu drž ve stavu, který začíná na Red.',
      'Udělej select řízený: jeho value čte ze stavu a jeho handler změny zapisuje nový výběr zpátky do stavu.',
      'Větu vykresli ze stejné stavové hodnoty, takže se nikdy nemůže rozejít se selectem.',
    ],
  },
  'react-counter': {
    title: 'Počítadlo',
    prompt:
      'Zobraz číslo, které začíná na 0, a tlačítko, které k němu přičte jedničku. Počítá se každé kliknutí: po třech kliknutích musí být vidět 3, ne 1.',
    hints: ['Začni na 0 a v handleru kliknutí vycházej z předchozí hodnoty.'],
    approach: [
      'Počet drž v useState s počáteční nulou, aby už první vykreslení ukázalo výchozí číslo.',
      'V handleru kliknutí zavolej setter s updater funkcí, aby se nový počet odvodil z předchozího.',
      'Počet vykresli přímo ze stavu, nesleduj ho v žádné další proměnné.',
    ],
  },
  'react-toggle-button': {
    title: 'Přepínací tlačítko',
    prompt:
      'Vykresli jedno tlačítko, jehož vlastní popisek je na začátku OFF, po kliknutí se změní na ON a po dalším kliknutí zpátky na OFF. Slovo je uvnitř tlačítka, ne vedle něj.',
    hints: ['Ulož si boolean a při kliknutí ho nahraď jeho opakem.'],
    approach: [
      'V useState drž jeden boolean, který říká, jestli je tlačítko právě zapnuté.',
      'Při kliknutí předej setteru updater funkci, která vrátí negaci předchozího booleanu.',
      'Popisek vyber ternárním operátorem nad tím booleanem, aby jeden element button vykreslil jedno ze dvou slov.',
    ],
  },
  'react-live-paragraph': {
    title: 'Živý odstavec',
    prompt:
      'Vykresli textový input a pod ním odstavec. Odstavec ukazuje přesně to, co je právě v inputu, a mění se s každým stiskem klávesy; input zůstává řízený — jeho hodnota pochází z tvého stavu.',
    hints: ['Použij jednu stavovou hodnotu pro hodnotu inputu i text odstavce.'],
    approach: [
      'Drž jeden řetězec v useState jako jediný zdroj pravdy pro input i odstavec.',
      'Udělej input řízený: dej mu ten stav jako value a při změně ulož do stavu hodnotu z cíle události.',
      'Stejnou stavovou hodnotu vykresli uvnitř odstavce, takže sám zrcadlí každý stisk klávesy.',
    ],
  },
  'react-data-list': {
    title: 'Seznam dat',
    prompt:
      'Vykresli lidi deklarované ve startovním kódu jako UL s jedním LI na osobu, kde je vidět jméno a věk. Každému LI dej key, který identifikuje osobu, ne její pozici v poli.',
    hints: ['Projdi data přes map, pro každou osobu vrať jedno LI a jako key použij stabilní hodnotu.'],
    approach: [
      'Vyjdi z dodaného pole people; stav nepotřebuješ, protože se na obrazovce nikdy nic nemění.',
      'Uvnitř seznamu pole projdi přes map a pro každou osobu vrať jednu položku seznamu.',
      'Každé položce dej key ze stabilní vlastnosti id, nikdy z indexu v poli.',
    ],
  },
  'react-show-and-hide': {
    title: 'Zobrazit a skrýt',
    prompt:
      'Vykresli tlačítko a odstavec. Odstavec na začátku v DOMu být nesmí; kliknutí ho přidá, další kliknutí ho odebere. Vykresluj ho podmíněně, ne skrýváním přes CSS.',
    hints: ['Odstavec vykresli jen tehdy, když je boolean ve stavu true.'],
    approach: [
      'V useState drž boolean, který říká, jestli je odstavec právě vidět.',
      'Handler tlačítka ať ten boolean překlopí updater funkcí z předchozí hodnoty.',
      'Odstavec vykresli přes podmíněný výraz, aby byl ve stromu jen tehdy, když je boolean true.',
    ],
  },
  'react-add-a-todo': {
    title: 'Přidej úkol',
    prompt:
      'Vykresli textový input, tlačítko Add a UL, který začíná prázdný. Přidání připojí napsaný text jako nové LI a input vyprázdní; druhý úkol nesmí nahradit první.',
    hints: ['Input a úkoly drž v oddělených stavech a při přidání vytvoř nové pole.'],
    approach: [
      'Použij dva samostatné useState: řetězec pro text inputu a pole pro úkoly.',
      'Input nech řízený, aby jeho value vždy odpovídalo textovému stavu.',
      'Při přidání sestav nové pole rozbalením předchozích úkolů a připojením objektu s unikátním id, potom textový stav vrať na prázdný řetězec.',
    ],
  },
  'react-remove-a-todo': {
    title: 'Odeber úkol',
    prompt:
      'Startovní kód obsahuje tři úkoly. Každý vykresli jako LI s jeho textem a vlastním tlačítkem Remove; kliknutí na jedno Remove smaže jen ten úkol a ostatní nechá na místě.',
    hints: ['Přes filter vyřaď položku, jejíž id odpovídá kliknutému tlačítku.'],
    approach: [
      'Úkoly drž v useState, aby odebrání položky vyvolalo nové vykreslení.',
      'Úkoly namapuj na položky seznamu; každá vykreslí svůj text a tlačítko pro odebrání, které zná své id.',
      'V handleru odebrání zavolej setter s filter, aby vrátil nové pole bez odpovídajícího id místo úpravy starého na místě.',
    ],
  },
  'react-search-a-list': {
    title: 'Hledání v seznamu',
    prompt:
      'Filtruj jména deklarovaná ve startovním kódu textovým inputem a shody vykresli jako LI — před psaním všechna tři. Porovnávání ignoruje velikost písmen, takže po napsání ANA zůstane Ana na obrazovce.',
    hints: ['Ukládej jen dotaz a vyfiltrovaná jména odvoď při vykreslení.'],
    approach: [
      'V useState drž jen hledaný řetězec; seznam jmen je konstanta, která se nikdy nemění.',
      'Input napoj na stav s dotazem, aby ho každý stisk klávesy aktualizoval.',
      'Vyfiltrovaná jména odvoď při vykreslení tak, že před porovnáním převedeš jméno i dotaz na malá písmena, takže druhý stav nepotřebuješ.',
    ],
  },
  'react-controlled-form': {
    title: 'Řízený formulář',
    prompt:
      'Vykresli formulář se dvěma inputy — jménem a e-mailem — a odesílacím tlačítkem. Odeslání nesmí obnovit stránku a obě odeslané hodnoty se pak objeví na obrazovce. Před prvním odesláním se nezobrazuje nic.',
    hints: ['V onSubmit zavolej preventDefault a zkopíruj stav formuláře do stavu s odeslanými hodnotami.'],
    approach: [
      'Živá pole drž v jednom objektu v useState a odeslaný výsledek v druhém stavu, který začíná prázdný.',
      'Oba inputy udělej řízené; podle atributu name změněného inputu aktualizuj odpovídající klíč objektu formuláře.',
      'V handleru odeslání nejdřív zavolej preventDefault a potom zkopíruj aktuální stav formuláře do stavu s odeslanými hodnotami.',
      'Odeslané hodnoty vykresli podmíněně, aby se před prvním odesláním nic neukázalo.',
    ],
  },
  'react-effect-on-mount': {
    title: 'Efekt při mountu',
    prompt:
      'Vykresli text „Waiting…“ a po připojení komponenty ho nahraď textem „Ready!“ — po prvním vykreslení, ne během něj. Čekací text potom musí zmizet.',
    hints: ['Efekt s [] se spustí po prvním vykreslení.'],
    approach: [
      'Text hlášky drž v useState; počáteční hodnota je čekací text.',
      'Přidej useEffect s prázdným polem závislostí, aby jeho tělo proběhlo jednou po prvním vykreslení.',
      'Uvnitř efektu nastav stav na text připravenosti; nové vykreslení obsah odstavce vymění.',
    ],
  },
  'react-document-title': {
    title: 'Titulek dokumentu',
    prompt:
      'Vykresli počet začínající na 0 a tlačítko, které ho zvýší, a drž document.title v souladu: při prvním vykreslení obsahuje 0, po jednom kliknutí 1.',
    hints: ['Dej count do pole závislostí efektu.'],
    approach: [
      'Počítadlo drž v useState a v handleru tlačítka ho aktualizuj z předchozí hodnoty.',
      'Přidej useEffect, který přiřadí do document.title řetězec složený z aktuálního počtu.',
      'Uveď count v poli závislostí efektu, aby se titulek přepsal po každé změně, ne jen při mountu.',
    ],
  },
  'react-delayed-message': {
    title: 'Zpožděná zpráva',
    prompt:
      'Hned zobraz „Waiting…“ a o sekundu později „Done!“, pomocí timeoutu. Při odpojení komponenty timeout zruš, aby nikdy nemohl vystřelit proti komponentě, která už neexistuje.',
    hints: ['Vrať cleanup funkci, která zavolá clearTimeout.'],
    approach: [
      'Zprávu drž v useState; začni zástupným textem, který je vidět, než zpoždění uplyne.',
      'V useEffect s prázdným polem závislostí spusť jednosekundový setTimeout, který nastaví výslednou zprávu.',
      'Z efektu vrať cleanup funkci, která uložené id timeoutu zruší, takže unmount nemůže vést k pozdnímu nastavení stavu.',
    ],
  },
  'react-get-one-user': {
    title: 'GET jednoho uživatele',
    prompt: 'Načti uživatele 1 z cvičného API a jakmile odpověď dorazí, vykresli jeho jméno a e-mail.',
    hints: ['Načítej v efektu, počkej na response.json() a uživatele ulož do stavu.'],
    approach: [
      'Stav uživatele začni na null, aby komponenta rozlišila ještě nenačtený záznam od načteného.',
      'Jednoho uživatele načti uvnitř useEffect s prázdným polem závislostí, aby požadavek odešel jednou při mountu.',
      'Počkej na rozparsované JSON tělo, ulož celý objekt do stavu a z něj čti jméno a e-mail.',
      'Vykreslení ohlídej podmínkou, aby se místo uživatele ukázal náhradní obsah, dokud je stav null.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-get-users-list': {
    title: 'GET seznamu uživatelů',
    prompt:
      'Načti seznam uživatelů a vykresli jedno LI na uživatele s jeho jménem. Začni s prázdným polem, aby první vykreslení, ještě před příchodem dat, nevyhodilo chybu.',
    hints: ['Začni s prázdným polem, aby users.map bylo vždy bezpečné.'],
    approach: [
      'Stav users inicializuj jako prázdné pole, aby bylo mapování bezpečné už při úplně prvním vykreslení.',
      'Kolekci uživatelů načti v useEffect s prázdným polem závislostí a rozparsované pole ulož do stavu.',
      'To pole namapuj na položky seznamu a každou klíčuj id uživatele, které API vrací.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-loading-state': {
    title: 'Stav načítání',
    prompt:
      'Načti seznam uživatelů. Dokud požadavek běží, ukazuj „Loading…“, potom ho nahraď jedním LI na uživatele s jeho jménem.',
    hints: ['Loading vypni ve finally, aby načítání skončilo po úspěchu i po chybě.'],
    approach: [
      'Vedle stavu s polem uživatelů přidej druhý useState s booleanem loading, který začíná na true.',
      'Načítej v efektu při mountu a uživatele nastav z rozparsované odpovědi.',
      'Loading vypni v bloku finally, aby načítání skončilo po úspěchu i po chybě.',
      'Dokud je příznak true, vrať brzy pohled s načítáním; jakmile je false, vrať namapovaný seznam.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-fetch-error-state': {
    title: 'Chyba při načítání',
    prompt:
      'Načti seznam uživatelů a vykresli jedno LI na uživatele. Když požadavek selže, nevykresli žádné položky a místo nich ukaž krátkou zprávu — a odpověď, která není OK, ber jako selhání, ne jen vyhozenou síťovou chybu.',
    hints: ['Zkontroluj response.ok a než přečteš JSON, vyhoď Error.'],
    approach: [
      'Vedle pole uživatelů drž v useState chybový řetězec; oba začínají prázdné.',
      'Uvnitř efektu definuj async funkci a tam ji zavolej, protože samotný callback efektu async být nesmí.',
      'Před parsováním zkontroluj response.ok a vyhoď Error, aby špatný status skončil v bloku catch.',
      'Zachycenou zprávu ulož do chybového stavu, a když je nastavená, vykresli místo seznamu srozumitelnou zprávu.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-select-fetched-user': {
    title: 'Výběr načteného uživatele',
    prompt:
      'Načti uživatele a vykresli jedno tlačítko na uživatele s jeho jménem jako popiskem. Jeho detaily — jméno a e-mail — se objeví až po kliknutí na tlačítko; na začátku není vybraný nikdo.',
    hints: ['Users a selectedUser drž v oddělených stavových hodnotách.'],
    approach: [
      'Drž dva samostatné stavy: pole načtených uživatelů a právě vybraného uživatele, který začíná na null.',
      'Uživatele načti jednou v efektu při mountu a rozparsované pole ulož.',
      'Uživatele namapuj na tlačítka, každé se stabilním key a handlerem kliknutí, který uloží celý objekt uživatele do vybraného stavu.',
      'Sekci s detaily vykresli podmíněně podle vybraného stavu, aby se před výběrem nic neukázalo.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-filter-fetched-users': {
    title: 'Filtrování načtených uživatelů',
    prompt:
      'Načti uživatele jednou a potom vykreslený seznam LI filtruj textovým inputem bez ohledu na velikost písmen. Filtruje se lokálně: neposílej nový požadavek při každém stisku klávesy.',
    hints: ['Načti jednou. Filtruj lokálně z users a query — nenačítej při každém stisku klávesy.'],
    approach: [
      'Uživatele načti jednou v efektu s prázdným polem závislostí; dotaz mezi závislostmi být nesmí.',
      'Hledaný text drž ve vlastním useState napojeném na řízený input.',
      'Viditelný seznam odvoď při vykreslení filtrováním načtených uživatelů podle podřetězce bez ohledu na velikost písmen.',
      'Mapuj jen tento odvozený seznam, takže psaní nikdy nespustí další síťový požadavek.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-refresh-data': {
    title: 'Obnovení dat',
    prompt:
      'Při mountu komponenty načti jeden úkol a vykresli jeho title; po kliknutí na tlačítko Refresh načti další. Požadavek dej do jedné funkce, kterou volá efekt i handler kliknutí.',
    hints: ['Požadavek dej do funkce, kterou může zavolat useEffect i onClick.'],
    approach: [
      'Požadavek vytáhni do jedné pojmenované async funkce, která načte náhodný úkol a zapíše ho do stavu.',
      'Stejnou funkci zavolej z useEffect s prázdným polem závislostí, aby se data načetla při mountu.',
      'Stejnou funkci předej jako handler kliknutí tlačítka Refresh, aby obě cesty sdílely jeden kód.',
      'Úkol vykresli podmíněně, protože stav je null, dokud se první požadavek nevyřídí.',
    ],
    apiNote: 'Koncové id můžeš měnit v rozsahu 1 až 200 a procvičit si tak načítání různých úkolů.',
  },
  'react-post-a-new-post': {
    title: 'POST nového příspěvku',
    prompt:
      'Vykresli formulář s inputem pro title. Při odeslání pošli ten title jako JSON metodou POST na endpoint posts a vykresli, co se vrátí — title a id, které mu API přidělí.',
    hints: ['Použij method POST, hlavičku s JSON content-type a JSON.stringify pro body.'],
    approach: [
      'Input s title drž v řízeném stavu a vytvořený objekt v samostatném stavu, který začíná na null.',
      'V handleru odeslání zavolej preventDefault a potom fetch na endpoint posts s method POST.',
      'Pošli hlavičku s JSON content-type a body prožeň přes JSON.stringify, protože fetch objekt sám neserializuje.',
      'Rozparsovanou odpověď ulož do stavu s vytvořeným objektem a vykresli ho až tehdy, když je naplněný.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
  'react-create-and-append': {
    title: 'Vytvoř a připoj',
    prompt:
      'Začni s prázdným UL a tlačítkem Add. Kliknutí pošle POST s novým úkolem a po příchodu odpovědi připojí vytvořený úkol do seznamu — seznam přejde z žádné položky na jednu.',
    hints: ['Po úspěšném požadavku aktualizuj přes previous => [...previous, created].'],
    approach: [
      'Stav s úkoly začni jako prázdné pole a z async handleru kliknutí pošli POST s novým úkolem.',
      'Nastav method POST, hlavičku s JSON content-type a body přes JSON.stringify popisující nový úkol.',
      'Z odpovědi počkej na vytvořený záznam a připoj ho funkční aktualizací stavu, která rozbalí předchozí pole.',
      'Vykreslené položky klíčuj vráceným id; když API id opakuje, použij náhradně index.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
  'react-user-by-id': {
    title: 'Uživatel podle id',
    prompt:
      'Vykresli select, jehož hodnoty option jsou id uživatelů — stačí 1 a 2 — a při každé změně výběru načti daného uživatele a ukaž jeho jméno. Změna výběru musí načíst znovu, ne dál ukazovat prvního uživatele.',
    hints: ['Dej selectedId do pole závislostí a sestav z něj URL.'],
    approach: [
      'Vybrané id drž v useState a řiď ho řízeným selectem; zvolenou hodnotu převeď na číslo.',
      'URL požadavku sestav uvnitř efektu ze společného základu a právě vybraného id.',
      'Vybrané id uveď v poli závislostí, aby efekt při každé změně proběhl znovu a znovu načetl.',
      'Uživatele vykresli podmíněně, protože mezi výběrem a odpovědí je stav null.',
    ],
    apiNote: 'Když se vybraný uživatel změní, nahraď koncové id.',
  },
  'react-debounced-search': {
    title: 'Hledání s debounce',
    prompt:
      'Vykresli input a pod ním ukaž ustálený dotaz. Zobrazená hodnota se aktualizuje až 500 ms po skončení psaní, takže rychlá dávka stisků kláves vyvolá jednu aktualizaci, ne jednu na klávesu.',
    hints: ['Při změně dotazu vytvoř timeout a v cleanupu zruš ten předchozí.'],
    approach: [
      'Použij dva stavy: okamžitý dotaz napojený na input a ustálený dotaz, který čte zobrazení.',
      'V useEffect závislém na dotazu spusť setTimeout na 500 ms, který dotaz zkopíruje do ustáleného stavu.',
      'Vrať cleanup funkci, která ten timeout zruší, takže každý nový stisk klávesy zruší předchozí čekající aktualizaci.',
      'Vykresluj jen z ustálené hodnoty; právě proto se zobrazení opožďuje za psaním.',
    ],
  },
  'react-abort-a-request': {
    title: 'Zrušení požadavku',
    prompt:
      'Načti příspěvky v efektu, a pokud se komponenta odpojí dřív, než se požadavek vyřídí, požadavek zruš, aby potom neproběhla žádná aktualizace stavu.',
    hints: ['Controller vytvoř uvnitř efektu a v cleanupu zavolej controller.abort().'],
    approach: [
      'Nový AbortController vytvoř uvnitř těla efektu, ne mimo něj, aby každý běh vlastnil svůj controller.',
      'Signál controlleru předej v objektu s options pro fetch, aby prohlížeč mohl běžící požadavek zrušit.',
      'Vrať cleanup funkci, která controller zruší, když se komponenta odpojí nebo efekt proběhne znovu.',
      'Odmítnutí zachyť a ignoruj ho, když má chyba name AbortError, protože záměrné zrušení není selhání.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-paginated-posts': {
    title: 'Stránkované příspěvky',
    prompt:
      'Načti příspěvky a ukazuj je po pěti jako LI, s tlačítky Previous a Next. První stránka obsahuje příspěvky jedna až pět; Next posune na dalších pět.',
    hints: ['Stránku drž ve stavu. Spočítej počáteční index a načtené pole vyřízni přes slice.'],
    approach: [
      'Všechny příspěvky načti jednou v efektu při mountu a celé pole drž ve stavu.',
      'Číslo aktuální stránky sleduj ve vlastním useState začínajícím na jedničce, s pevnou konstantou velikosti stránky.',
      'Viditelný výřez odvoď při vykreslení z čísla stránky a její velikosti místo ukládání druhého pole.',
      'Previous a Next napoj na aktualizaci stavu stránky a každé tlačítko na své hranici zakaž.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-dependent-fetch': {
    title: 'Závislé načítání',
    prompt:
      'Vykresli select, jehož hodnoty option jsou id uživatelů — stačí 1 a 2. Výběr načte příspěvky daného uživatele a vykreslí je jako LI a změna výběru načte znovu; oba uživatelé nemají stejný počet příspěvků.',
    hints: ['Efekt s příspěvky spusť pokaždé, když se změní selectedUserId.'],
    approach: [
      'Id vybraného uživatele drž ve stavu a měň ho z řízeného selectu uživatelů.',
      'Napiš jeden efekt, který načte příspěvky filtrované podle toho id přes parametr v query stringu URL.',
      'Vybrané id dej do pole závislostí toho efektu, aby volba jiného uživatele načetla jeho příspěvky znovu.',
      'Příspěvky namapuj na klíčovaný seznam, který se prostě vykreslí znovu, kdykoli se pole ve stavu nahradí.',
    ],
    apiNote: 'userId nahraď id právě vybraného uživatele.',
  },
  'react-optimistic-todo': {
    title: 'Optimistický úkol',
    prompt:
      'Vykresli formulář s inputem pro title. Při odeslání přidej úkol do seznamu okamžitě — ještě před vyřízením POSTu — a teprve potom ho odešli. Když požadavek selže, úkol zase odeber, aby se seznam vrátil na prázdný.',
    hints: ['Předchozí seznam si nech, aby ho catch mohl při selhání požadavku obnovit.'],
    approach: [
      'Než cokoli pošleš, připoj dočasný úkol s lokálně vygenerovaným id a příznakem pending, aby se seznam aktualizoval hned.',
      'Potom pošli POST se skutečným title, zkontroluj response.ok a při neúspěšném statusu vyhoď chybu.',
      'Při úspěchu dočasnou položku nahraď: seznam projdi přes map a u odpovídajícího id dosaď uložený záznam.',
      'V bloku catch změnu vrať tak, že dočasné id ze seznamu odfiltruješ, takže neúspěšná položka zmizí.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
  'react-reusable-usefetch-hook': {
    title: 'Znovupoužitelný hook useFetch',
    prompt:
      'Napiš useFetch(url), který vrací data, loading a error, a použij ho v App: „Loading…“ dokud požadavek běží, jedno LI na uživatele při úspěchu a při selhání žádné položky a zpráva.',
    hints: ['Tři stavové hodnoty a efekt s požadavkem přesuň do funkce, jejíž název začíná na use.'],
    approach: [
      'Stavy data, loading a error i efekt s požadavkem přesuň do funkce, jejíž název začíná na use a která bere URL jako argument.',
      'Na začátku efektu se vrať do stavu načítání a závis na URL, aby nová adresa spustila nový požadavek.',
      'Zkontroluj response.ok, rozparsuj JSON a zapiš buď data, nebo chybovou zprávu, než loading vypneš.',
      'Z hooku vrať ty tři hodnoty; komponenta si je destrukturuje a větví se podle loading a error.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-crud-mini-app': {
    title: 'Mini CRUD aplikace',
    prompt:
      'Načti příspěvky a každý vykresli jako LI s jeho title, tlačítkem Edit a tlačítkem Delete, plus formulář, který vytvoří nový. Vytvoření připojí příspěvek s napsaným title; Edit ho na místě přejmenuje na „Edited“; Delete odebere jen ten příspěvek. Úprava a mazání jsou lokální — žádný požadavek není potřeba.',
    hints: ['Stavěj po jedné operaci: GET, vykreslení, POST, úprava přes map, mazání přes filter.'],
    approach: [
      'Stavěj po jedné operaci; začni GETem do pole příspěvků a příznakem loading.',
      'Přidej řízený input pro title, jehož handler odeslání pošle POST s novým příspěvkem a vytvořený záznam neměnně připojí.',
      'Úpravu udělej přes map: vrať rozbalenou kopii s novým title jen pro odpovídající id.',
      'Mazání udělej přes filter podle id, takže obě lokální operace pole nahradí, místo aby ho měnily na místě.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
  'react-stopwatch': {
    title: 'Stopky',
    prompt:
      'Ukazuj uplynulé celé sekundy v odstavci, od 0, s tlačítky Start, Stop a Reset. Start počítá nahoru jednou za sekundu, Stop číslo zmrazí tam, kde je, a Reset ho vrátí na 0. Dvojí stisk Startu nesmí nechat běžet dva intervaly.',
    hints: ['Id intervalu drž v refu, aby Stop mohl zrušit interval, který Start vytvořil.'],
    approach: [
      'Uplynulé sekundy drž ve stavu a id intervalu v refu, aby přežilo nová vykreslení, aniž by je vyvolávalo.',
      'Start otevře interval, který přičítá po sekundě, a nemá dělat nic, když už je nějaké id intervalu uložené.',
      'Stop uložený interval zruší a jeho id zapomene; Reset ho zruší také a uplynulé sekundy vrátí na nulu.',
      'Interval ruš i v cleanupu efektu, aby unmount uprostřed běhu nenechal tikat časovač na mrtvé komponentě.',
    ],
  },
  'react-uselocalstorage-hook': {
    title: 'Hook useLocalStorage',
    prompt:
      'Napiš useLocalStorage(key, initial), který se chová jako useState, ale hodnotu uchová. Použij ho pro počítadlo vykreslené jako „Count: n“ s tlačítkem Increment: když je úložiště prázdné, začne na initial, každou změnu zapíše do localStorage a po opětovném připojení počet načte zpátky.',
    hints: ['Uloženou hodnotu přečti při prvním vytvoření stavu a zapiš ji zpět, kdykoli se změní.'],
    approach: [
      'Napiš funkci, jejíž název začíná na use, bere klíč a počáteční hodnotu a vrací aktuální hodnotu s jejím setterem.',
      'Její stav inicializuj líným inicializátorem, který klíč z úložiště přečte jednou a použije počáteční hodnotu, když nic uloženo není.',
      'Přidej efekt závislý na klíči a hodnotě, který hodnotu serializuje a po každé změně zapíše zpět do úložiště.',
      'V počítadle hook zavolej přesně tak, jako bys volal useState, aby remount číslo načetl zpátky místo startu od nuly.',
    ],
  },
  'react-tabs': {
    title: 'Záložky',
    prompt:
      'Vykresli tři záložky deklarované ve startovním kódu, každou jako tlačítko s role="tab", a přesně jeden element s role="tabpanel" s obsahem vybrané záložky. Vybraná záložka nese aria-selected="true", ostatní "false".',
    hints: ['Ulož id aktivní záložky a záložkám dej role tab s aria-selected.'],
    approach: [
      'Tři záložky popiš jako pole objektů, každý s id, viditelným popiskem a obsahem svého panelu.',
      'Id aktivní záložky sleduj v jediném stavu, který začíná id první záložky z toho pole.',
      'Každou záložku vykresli jako tlačítko s rolí tab, příznakem aria-selected porovnávajícím její id s aktivním a handlerem, který její id uloží.',
      'Vykresli jeden element s rolí tabpanel a naplň ho obsahem záložky, která je právě aktivní.',
    ],
  },
  'react-accordion': {
    title: 'Akordeon',
    prompt:
      'Vykresli tři sekce deklarované ve startovním kódu, každou jako tlačítko v záhlaví s odstavcem těla. Na začátku není vidět žádné tělo; kliknutí na záhlaví danou sekci otevře a otevření druhé zavře první — nikdy dvě těla naráz.',
    hints: ['Ukládej id jediné otevřené sekce, ne příznak u každé z nich.'],
    approach: [
      'Drž jeden stav s id otevřené sekce, který začíná na null, protože všechny sekce začínají zavřené.',
      'Sekce namapuj každou na tlačítko v záhlaví a o otevření rozhodni porovnáním jejího id s uloženým.',
      'Kliknutí na záhlaví uloží jeho id, nebo ho vrátí na null, když je stejná sekce už otevřená, čímž ji sbalí.',
      'Protože jedno id odpovídá jen jedné sekci, otevření další zavře předchozí bez dalšího hlídání.',
    ],
  },
  'react-star-rating': {
    title: 'Hvězdičkové hodnocení',
    prompt:
      'Vykresli jedno tlačítko na každou položku pole stars ze startovního kódu a řádek „Rating: n“, který začíná na 0. Najetí na hvězdičku hodnocení ukáže jako náhled, odjetí kurzoru vrátí potvrzené a kliknutí ho potvrdí — po kliknutí na čtvrtou hvězdičku řádek říká „Rating: 4“.',
    hints: ['Hodnotu pod kurzorem a potvrzenou hodnotu drž odděleně a zobraz tu, která zrovna platí.'],
    approach: [
      'Ve stavu drž dvě čísla: potvrzené hodnocení a hvězdičku právě pod kurzorem, obě od nuly.',
      'Při vykreslení odvoď, kolik hvězdiček vypadá vyplněně; přednost má číslo pod kurzorem, náhradně potvrzené hodnocení.',
      'Každé hvězdičce dej handler najetí kurzoru, který zaznamená její pozici, a handler kliknutí, který tu pozici potvrdí jako hodnocení.',
      'Když kurzor řádek opustí, číslo pod kurzorem vrať na nulu, aby zobrazení spadlo zpět na to, co bylo naposledy kliknuté.',
    ],
  },
  'react-modal': {
    title: 'Modální okno',
    prompt:
      'Tlačítko Open zobrazí element s role="dialog" uvnitř pozadí (backdrop). Zavře se tlačítkem Close, klávesou Escape a kliknutím na pozadí — ale kliknutí dovnitř samotného dialogu ho musí nechat otevřený.',
    hints: ['Posluchač klávesy přidej v efektu, dokud je dialog otevřený, a v cleanupu ho odeber.'],
    approach: [
      'Drž ve stavu jeden boolean, jestli je dialog otevřený, a překryvnou vrstvu vykresluj jen tehdy, když je true.',
      'Zavíracímu tlačítku dej handler, který boolean vrátí na false, a stejný handler dej i na element pozadí.',
      'Uvnitř dialogu zastav propagaci kliknutí, jinak klik na jeho vlastní obsah probublá na pozadí a dialog zavře.',
      'Z efektu, který běží, dokud je dialog otevřený, přidej na document posluchač keydown, který na Escape zavře, a v cleanupu ho odeber.',
    ],
  },
  'react-theme-context': {
    title: 'Kontext motivu',
    prompt:
      'Vytvoř kontext motivu, který drží „light“ nebo „dark“ a způsob, jak ho změnit. App ho poskytuje; vnořený potomek — ne samotná App — hodnotu čte a vykreslí tlačítko, které ukazuje aktuální motiv a po kliknutí ho přepne.',
    hints: ['Hodnotu i její setter dej do jedné hodnoty provideru, aby obojí dosáhlo do libovolné hloubky.'],
    approach: [
      'Kontext vytvoř mimo komponentu, aby všichni konzumenti sdíleli jeden objekt místo nového při každém vykreslení.',
      'Aktuální motiv drž ve stavu nahoře a hodnotou provideru předej motiv i přepínací funkci.',
      'Vnořeného potomka vykresli uvnitř provideru a nech ho číst, co potřebuje, z hooku kontextu místo z props.',
      'Přepnutí zavolej z potomka; aktualizuje stav nahoře a znovu vykreslí každého konzumenta s novým motivem.',
    ],
  },
  'react-usedebounce-hook': {
    title: 'Hook useDebounce',
    prompt:
      'Napiš useDebounce(value, delay), který hodnotu vrátí až poté, co se po dobu delay nezměnila. Použij ho k filtrování ovoce deklarovaného ve startovním kódu do UL: na začátku jsou vidět všechna tři a psaní seznam zúží až poté, co se ustálí.',
    hints: ['Každá nová hodnota naplánuje timeout a cleanup zruší ten předchozí.'],
    approach: [
      'Napiš hook, který bere hodnotu a zpoždění a drží vlastní stav s naposledy ustálenou kopií té hodnoty.',
      'V efektu závislém na hodnotě a zpoždění naplánuj timeout, který příchozí hodnotu zkopíruje do toho stavu.',
      'Vrať cleanup, který čekající timeout zruší, takže hodnota, která dorazí uprostřed čekání, plán nahradí, místo aby přidala další.',
      'Stav inputu prožeň hookem a seznam filtruj tím, co vrátí, takže se seznam změní až po pauze v psaní.',
    ],
  },
  'react-todo-dashboard': {
    title: 'Přehled úkolů',
    prompt:
      'Při mountu načti z cvičného API první tři úkoly. Každý úkol v odpovědi nese title a příznak completed a každé LI musí ukázat obojí: title, potom „done“ nebo „to do“, potom tlačítko Remove. Nad seznamem ukaž řádek „Done: n of m“, kde n počítá dokončené. Textový input a tlačítko Add připojí nový úkol s tím title a completed false; Remove odebere jen ten jeden úkol.',
    hints: ['Jedno pole ve stavu drží úkoly, ať přišly jakkoli. Přidání, odebrání i počítání jsou jen jeho odvozeniny.'],
    approach: [
      'Začni s jediným stavem: polem úkolů. Všechno na obrazovce — seznam, počty, co dělá tlačítko Remove — se z něj odvozuje.',
      'Načti ho jednou při mountu efektem s prázdným polem závislostí a to, co přijde, dej do téhož stavu, ne do druhého.',
      'Přidání sestaví nové pole s tvým novým úkolem na konci; odebrání sestaví nové pole s jedním odfiltrovaným. Existující pole nikdy neměň na místě.',
      'Počty nejsou stav. Počet dokončených odvoď z pole při vykreslení a nikdy se nemůže rozejít se seznamem vedle něj.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-product-search': {
    title: 'Hledání produktů',
    prompt:
      'Při mountu načti z cvičného API produkty — tento endpoint vnořuje své pole pod klíč products, takže pole není samo tělo odpovědi. Každé LI ukazuje tři vlastnosti produktu: jeho title, price a category. Vyhledávací input filtruje během psaní a porovnává bez ohledu na velikost písmen proti title nebo category, takže „tech“ najde laptop. Nad seznamem je řádek „Total: n“, součet price jen právě zobrazených produktů.',
    hints: ['Načtený seznam a hledaný text drž v oddělených stavech a to, co se zobrazí, odvoď z obojího při vykreslení, místo abys ukládal druhý seznam.'],
    approach: [
      'Dva stavy a žádný další: produkty, které dorazily, a text ve vyhledávacím poli. Co se zobrazí, se odvodí z obou.',
      'Načti při mountu a pamatuj, že tohle API vnořuje pole pod klíč — produkty přečti z těla odpovědi, nepoužívej tělo samotné.',
      'Filtruj při vykreslení a porovnávej v jedné velikosti písmen, aby napsání MUG našlo Mug. Ukládat vyfiltrovaný seznam do vlastního stavu je tady chyba; jen ti dá dvě věci, které musíš držet v souladu.',
      'Total se redukuje přes vyfiltrovaný seznam, ne přes celý, a právě proto se mění, jak píšeš.',
    ],
    apiNote: 'Tenhle endpoint vnořuje své pole pod klíč products, takže čti data.products, ne samotné tělo.',
  },
  'react-user-directory': {
    title: 'Adresář uživatelů',
    prompt:
      'Načti uživatele, přidej vyhledávání a filtr podle města, ukaž stavy načítání a chyby a vykresli výsledky. V komentářích vysvětli svůj plán pro API, cache a stránkování.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Nejdřív do komentářů načrtni tok dat: tvar API, plán cache a plán stránkování, které bys použil.',
      'Uživatele načti jednou v efektu při mountu se stavy loading a error; loading vypni v bloku finally.',
      'Hledaný text a zvolené město drž jako dva malé stavy napojené na řízené inputy.',
      'Viditelné uživatele odvoď při vykreslení zřetězením obou filtrů a výsledek namapuj s id uživatele jako key.',
    ],
    checklist: [
      'Seznam vykresluje načtené uživatele a vyhledávání i filtr města ho zužují.',
      'Stavy načítání i chyby jsou vidět ve správných okamžicích.',
      'Tvoje komentáře vysvětlují tvar API, cache a plán stránkování.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-posts-dashboard': {
    title: 'Přehled příspěvků',
    prompt:
      'Načti příspěvky, seskup je podle uživatele přes reduce a ukaž příspěvky vybraného uživatele. Vysvětli, jak by feed škáloval.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Příspěvky načti jednou se stavy loading a error a surové pole drž v jediném stavu.',
      'Seskupení odvoď při vykreslení přes reduce, které nasčítá objekt mapující každé id uživatele na jeho příspěvky.',
      'Id vybraného uživatele sleduj ve stavu a vykresli jen skupinu patřící tomu id, jako klíčovaný seznam.',
      'Zakonči komentáři o tom, jak by feed škáloval: stránkování na serveru, index nad sloupcem autora a cache.',
    ],
    checklist: [
      'Příspěvky jsou načtené a seskupené podle uživatele přes reduce.',
      'Výběr uživatele ukáže jen jeho příspěvky.',
      'Tvoje komentáře vysvětlují, jak by feed škáloval.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-todo-client': {
    title: 'Klient úkolů',
    prompt:
      'Načti úkoly, jeden přidej přes POST, lokálně přepínej a maž a ukaž statistiky dokončení. Vysvětli řešení konfliktů.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Než přidáš jakoukoli interakci, načti úkoly do jednoho pole ve stavu se zpracováním loading a error.',
      'Přidej řízený input, jehož handler odeslání pošle POST s novým úkolem a vytvořený záznam připojí do pole.',
      'Přepínej přes map na rozbalenou kopii s obráceným příznakem dokončení a maž přes filter podle id.',
      'Statistiky dokončení odvoď z toho pole při vykreslení a potom v komentářích vysvětli řešení konfliktů: poslední zápis vyhrává versus čísla verzí.',
    ],
    checklist: [
      'Úkoly jsou načtené, jeden jde přidat přes POST a přepínání i mazání funguje lokálně.',
      'Statistiky dokončení se odvozují ze stavu, nejsou uložené dvakrát.',
      'Tvoje komentáře vysvětlují řešení konfliktů.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
  'react-product-explorer': {
    title: 'Průzkumník produktů',
    prompt:
      'Načti produkty, filtruj, řaď, spočítej průměr přes reduce a stránkuj. Vysvětli vyhledávání a cache.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Načti jednou a pamatuj, že tohle API vnořuje záznamy do vlastnosti products, místo aby vrátilo holé pole.',
      'Dotaz, klíč řazení a číslo stránky drž jako tři samostatné stavy, každý napojený na vlastní ovládací prvek.',
      'Pipeline odvoď při vykreslení v tomto pořadí: filtruj podle dotazu, seřaď zkopírované pole a potom vyřízni aktuální stránku.',
      'Průměr spočítej přes reduce nad vyfiltrovanou množinou a v komentářích vysvětli indexování vyhledávání a cache.',
    ],
    checklist: [
      'Produkty jsou načtené, vyfiltrované, seřazené a stránkované.',
      'Průměr je odvozený přes reduce.',
      'Tvoje komentáře vysvětlují vyhledávání a cache.',
    ],
    apiNote: 'Veřejné cvičné API DummyJSON. Produkty jsou v poli products uvnitř odpovědi.',
  },
  'react-comments-viewer': {
    title: 'Prohlížeč komentářů',
    prompt:
      'Načti komentáře, vyber příspěvek, filtruj podle e-mailu a spočítej domény. Vysvětli stránkování a ochranu před zneužitím.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Komentáře načti jednou do pole ve stavu s větvemi pro loading a error.',
      'Id vybraného příspěvku a e-mailový dotaz drž v oddělených stavech napojených na řízené inputy.',
      'Viditelné komentáře odvoď filtrováním podle id příspěvku a podle podřetězce e-mailu bez ohledu na velikost písmen.',
      'Domény spočítej přes reduce nad adresami rozdělenými u zavináče a potom v komentářích vysvětli stránkování a ochranu před zneužitím.',
    ],
    checklist: [
      'Komentáře jsou načtené a filtrované podle e-mailu.',
      'Výběr příspěvku seznam zúží a domény jsou spočítané.',
      'Tvoje komentáře vysvětlují stránkování a ochranu před zneužitím.',
    ],
    apiNote: JSONPLACEHOLDER_NOTE,
  },
  'react-weather-style-dashboard': {
    title: 'Přehled ve stylu počasí',
    prompt:
      'Načti ukázková data, ukládej nedávná hledání, odvoď minimum a maximum a zvládni opakování požadavku. Vysvětli spolehlivost externího API.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Požadavek dej do jedné pojmenované async funkce, aby ji mohl zavolat efekt při mountu i tlačítko pro opakování.',
      'Loading a error sleduj odděleně a před každým novým pokusem předchozí chybu vymaž.',
      'Nedávná hledání drž v poli ve stavu; každé nové přidej na začátek a délku omez, místo abys ukládal duplicity.',
      'Minimum a maximum odvoď z načtených hodnot při vykreslení a potom v komentářích vysvětli spolehlivost externího API.',
    ],
    checklist: [
      'Data se načítají se stavy načítání a chyby a opakování požadavku je ošetřené.',
      'Nedávná hledání se uchovávají a minimum a maximum se odvozují.',
      'Tvoje komentáře vysvětlují spolehlivost externího API.',
    ],
    apiNote: 'Veřejný příklad Open-Meteo pro Prahu. Nepotřebuje API klíč.',
  },
  'react-notification-center': {
    title: 'Centrum oznámení',
    prompt:
      'Načti oznámení, filtruj nepřečtená, označuj je jako přečtená a seskup je podle data. Vysvětli doručování v reálném čase a úložiště.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Záznamy načti jednou do jediného pole ve stavu a příznak dokončení používej jako značku přečteno/nepřečteno.',
      'Jedno označ jako přečtené přes map na rozbalenou kopii se změněným příznakem jen u odpovídajícího id.',
      'Přepínač „jen nepřečtená“ drž ve stavu a viditelný seznam z něj odvoď, místo abys ukládal druhé pole.',
      'Viditelné položky seskup podle data přes reduce a potom v komentářích vysvětli doručování v reálném čase a úložiště.',
    ],
    checklist: [
      'Oznámení jsou načtená, nepřečtená se filtrují a označení jako přečtené aktualizuje stav.',
      'Položky jsou seskupené podle data.',
      'Tvoje komentáře vysvětlují doručování v reálném čase a úložiště.',
    ],
    apiNote: 'Dokončení úkolu použij jako cvičnou náhradu za stav přečteno/nepřečteno u oznámení.',
  },
  'react-booking-prototype': {
    title: 'Prototyp rezervace',
    prompt:
      'Vykresli dostupné termíny, jeden vyber, odešli rezervaci a zabraň duplicitnímu lokálnímu výběru. Vysvětli, jak server brání dvojité rezervaci.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Ukázkové termíny načti do pole ve stavu a každý vykresli jako klíčovanou klikací volbu.',
      'Id vybraného termínu drž ve stavu a termíny už lokálně zarezervované označ jako nedostupné.',
      'Při odeslání přesuň zvolený termín do seznamu rezervovaných a handler ohlídej, aby stejný termín nešel obsadit dvakrát.',
      'V komentářích vysvětli, proč je skutečnou pojistkou unikátní constraint nebo transakce na serveru, ne tahle kontrola v klientovi.',
    ],
    checklist: [
      'Dostupné termíny se vykreslí a jeden jde vybrat a odeslat.',
      'Duplicitnímu lokálnímu výběru je zabráněno.',
      'Tvoje komentáře vysvětlují, jak server brání dvojité rezervaci.',
    ],
    apiNote: 'Tyto záznamy použij jako ukázkové termíny a rezervaci namodeluj lokálně.',
  },
  'react-analytics-panel': {
    title: 'Analytický panel',
    prompt:
      'Načti události, sečti souhrny přes reduce, filtruj podle data a typu a vykresli souhrnné karty. Vysvětli úložiště událostí s velkým objemem zápisů.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Ukázkové události načti jednou do pole ve stavu se zpracováním loading a error.',
      'Rozsah dat a typ události drž jako oddělené stavy napojené na řízené inputy.',
      'Nejdřív odvoď vyfiltrované události a potom nad touto podmnožinou sečti souhrny přes reduce, aby karty sledovaly filtry.',
      'Vykresli jednu klíčovanou souhrnnou kartu na každý sečtený souhrn a v komentářích vysvětli úložiště událostí s velkým objemem zápisů.',
    ],
    checklist: [
      'Události jsou načtené a sečtené přes reduce.',
      'Filtry data a typu mění souhrnné karty.',
      'Tvoje komentáře vysvětlují úložiště událostí s velkým objemem zápisů.',
    ],
    apiNote: 'Vrácené záznamy použij jako ukázkové události pro procvičení agregace.',
  },
  'react-interview-mini-project': {
    title: 'Pohovorový miniprojekt',
    prompt:
      'Postav malou CRUD aplikaci s GET a POST, stavem, efekty, mapovanými seznamy, načítáním, chybami, filtry a odvozenými statistikami. Vysvětli celý tok od prohlížeče po databázi.',
    hints: [CAPSTONE_HINT],
    approach: [
      'Než napíšeš jakýkoli kód komponenty, napiš do komentářů uživatelský tok, datový model a endpointy.',
      'Nejdřív postav část s GET: jedno pole ve stavu, efekt při mountu, větve pro loading a error a klíčovaný mapovaný seznam.',
      'Potom přidej část s POST: vytvořený záznam neměnně připoj a řízený input vynuluj.',
      'Na existující pole navrstvi filtry a odvozené statistiky a potom v komentářích vysvětli tok od prohlížeče přes REST API do databáze.',
    ],
    checklist: [
      'GET i POST fungují, s mapovanými seznamy a stavy načítání a chyby.',
      'Filtry a odvozené statistiky vycházejí z existujícího stavu.',
      'Tvoje komentáře vysvětlují celý tok od prohlížeče po databázi.',
    ],
    apiNote: JSONPLACEHOLDER_WRITE_NOTE,
  },
};
