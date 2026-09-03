// Czech copy for lib/coding/tasks/react-loops.ts, keyed by task id. Arrays align by
// index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const REACT_LOOP_TASKS_CS: Record<string, CodingTaskCs> = {
  "react-heading-and-intro": {
    title: "Nadpis a úvod",
    prompt: "Výchozí kód deklaruje dvě konstanty, `title` a `intro`. Vykresli `title` uvnitř h1 a `intro` uvnitř odstavce a v JSX použij samotné konstanty, ne opsaný text. Stránka musí mít jako h1 přesně „Deep End“ a jako odstavec „Practise React one list at a time.“.",
    hints: ["Složené závorky vloží do JSX značek hodnotu z JavaScriptu."],
    approach: [
      "Vrať z App jeden rodičovský element, který obsahuje nadpis i odstavec.",
      "Do h1 vlož konstantu title ve složených závorkách místo opakování slov.",
      "Totéž udělej s intro v odstavci, aby se změnou konstanty změnila i stránka.",
    ],
  },
  "react-greeting-component": {
    title: "Komponenta Greeting",
    prompt: "Napiš komponentu `Greeting`, která přijme prop `name` a vykreslí odstavec s textem „Hello, <name>“. V `App` projdi pole `names` z výchozího kódu pomocí `map` a pro každé jméno vykresli jednu `Greeting`, takže stránka ukáže tři odstavce, „Hello, Ana“, „Hello, Bo“ a „Hello, Cyril“, v tomto pořadí.",
    hints: ["Komponenta je funkce, která dostane props a vrátí JSX, a map jich umí vrátit jednu pro každý prvek pole."],
    approach: [
      "Deklaruj Greeting nad App jako funkci, která si z props přečte name.",
      "Vrať z Greeting odstavec, který spojí pevné slovo se jménem.",
      "Uvnitř App namapuj pole names na elementy Greeting a každé jméno předej jako prop i jako key.",
    ],
  },
  "react-price-component": {
    title: "Komponenta Price",
    prompt: "Napiš komponentu `Price`, která přijme props `amount` a `currency` a vykreslí span s částkou na dvě desetinná místa, mezerou a měnou, takže `amount={3.5}` s `currency=\"EUR\"` dá „3.50 EUR“. Položky `items` z výchozího kódu vykresli jako UL s jedním LI na položku, kde je název položky a její `Price`, s key podle id položky.",
    hints: ["Props přijdou jako jeden objekt a toFixed(2) převede číslo na řetězec se dvěma desetinnými místy."],
    approach: [
      "Deklaruj Price nad App a z props si destrukturuj amount a currency.",
      "Naformátuj amount přes toFixed(2) a ve spanu ho spoj s měnou jednou mezerou.",
      "Namapuj items na položky seznamu s key podle id; každá vykreslí název a Price s amount a currency dané položky.",
    ],
  },
  "react-keyed-book-list": {
    title: "Seznam knih s klíči",
    prompt: "Vykresli pole `books` z výchozího kódu jako UL s jedním LI na knihu ve tvaru „<title> by <author>“ v pořadí pole, například „Dune by Frank Herbert“, a nad ním odstavec s textem „3 books“. Každé LI dostane key z `id` knihy, nikdy z indexu pole.",
    hints: ["Jedno volání map nad polem vrátí všechny položky seznamu a key patří na element, který callback vrací."],
    approach: [
      "Odstavec s počtem vykresli z délky pole, aby zůstal správný i po změně dat.",
      "Namapuj knihy na položky seznamu uvnitř UL a název s autorem spoj slovem by.",
      "Každé položce nastav key na id knihy, které zůstane stejné i při změně pořadí.",
    ],
  },
  "react-in-stock-list": {
    title: "Jen skladem",
    prompt: "Z produktů `products` ve výchozím kódu vykresli jen ty, které mají `inStock` true, jako UL s jedním LI na název produktu, a k tomu odstavec s textem „2 of 4 in stock“. Pole nejdřív profiltruj a teprve potom mapuj, takže Snorkel ani Wetsuit se nikdy neobjeví, a každé LI klíčuj podle id produktu.",
    hints: ["Zřetěz filter a map: filter nechá jen produkty, které chceš, a map z každého udělá položku seznamu."],
    approach: [
      "Sestav pole skladových produktů přes filter podle příznaku inStock mimo JSX, ať ho můžeš použít vícekrát.",
      "Profiltrované pole namapuj na položky seznamu s key uvnitř UL.",
      "Odstavec vykresli z délky profiltrovaného pole a z délky celého pole.",
    ],
  },
  "react-guest-list": {
    title: "Seznam hostů",
    prompt: "Vyjdi z pole `initialGuests` ve výchozím kódu a vykresli textový input, tlačítko Add a UL s jedním LI na hosta, kde je jméno a vlastní tlačítko Remove. Add připojí napsané jméno na konec seznamu a vyprázdní input; Remove odebere jen daného hosta. Existující pole nikdy neměň: při přidání sestav nové pole spreadem a při odebrání přes `filter`, aby nové připojení komponenty začalo zase od dvou původních hostů.",
    hints: ["Obě úpravy vytvoří nové pole: rozbal staré a přidej nového hosta, nebo staré profiltruj podle id."],
    approach: [
      "Drž pole hostů a text inputu ve dvou samostatných useState; pole naplň z initialGuests.",
      "Při Add ulož nové pole z předchozích hostů a objektu s novým id a oříznutým textem, potom text vymaž.",
      "Při Remove ulož výsledek filtru předchozích hostů podle jiného id, takže se původního pole nic nedotkne.",
    ],
  },
  "react-insert-and-reorder": {
    title: "Vložit a přeskládat",
    prompt: "Vykresli `initialStops` z výchozího kódu jako OL, kde každé LI ukazuje název zastávky ve spanu a tři tlačítka: „Insert after“, „Up“ a „Down“. Insert after vloží hned za danou položku novou zastávku „Stop <n>“ (n je aktuální délka plus jedna); Up prohodí položku s tou nad ní, Down s tou pod ní a na krajích se nic nestane. Každé další pole sestav ze `slice` a spreadu bez změny předchozího, takže Insert after na Reef dá Harbour, Reef, Stop 4, Lighthouse.",
    hints: ["Rozřízni pole na část před pozicí a část za ní a obě rozbal kolem toho, co patří mezi ně."],
    approach: [
      "Drž zastávky v useState naplněném z initialStops a každé obsluze předej index, se kterým pracuje.",
      "Pro Insert after rozbal řez až po index včetně, pak novou zastávku a nakonec řez za indexem.",
      "Pro Up a Down sestav pole z řezu před dvojicí, obou prvků v opačném pořadí a řezu za nimi; na krajích vrať předchozí pole beze změny.",
    ],
  },
  "react-toggle-done-with-map": {
    title: "Přepnutí done přes map",
    prompt: "Vykresli `initialTasks` z výchozího kódu jako UL, kde každé LI obsahuje checkbox a za ním text úkolu, zaškrtnutý když je `done` true, a k tomu odstavec s textem „1 of 3 done“. Kliknutí na checkbox přepne `done` jen u daného úkolu a pořadí seznamu zachová, takže po zaškrtnutí „Write tests“ odstavec zní „2 of 3 done“. Aktualizuj přes `map`: pro odpovídající úkol vrať nový objekt, pro všechny ostatní ten samý, aby nové připojení komponenty začalo zase od výchozích dat.",
    hints: ["Projdi předchozí pole přes map a odpovídající úkol rozbal do kopie s obráceným done, ostatní nech tak, jak jsou."],
    approach: [
      "Drž úkoly v useState naplněném z initialTasks; počet hotových odvoď z nich při vykreslení.",
      "Každý úkol vykresli jako položku seznamu s řízeným checkboxem, jehož checked je příznak done úkolu.",
      "V obsluze změny namapuj předchozí úkoly: pro shodné id vrať kopii s negovaným done, jinak úkol beze změny.",
    ],
  },
  "react-newest-first-todos": {
    title: "Nejnovější úkol nahoře",
    prompt: "Vykresli formulář s textovým inputem a tlačítkem Add a UL, který začíná prázdný. Odeslání přidá oříznutý text jako nové LI na začátek seznamu, nad všechno přidané dřív, a vyprázdní input; prázdné odeslání nepřidá nic. Po přidání „First“ a potom „Second“ musí být Second v seznamu před First.",
    hints: ["Dej novou položku na první místo a za ni rozbal předchozí pole, což je neměnná podoba unshift."],
    approach: [
      "Drž text inputu a pole úkolů v samostatných useState a input řiď jeho stavem.",
      "Obsluž submit formuláře, zavolej preventDefault a při prázdném oříznutém textu skonči.",
      "Jinak ulož nové pole s novým úkolem na začátku a předchozími rozbalenými za ním, potom text vymaž.",
    ],
  },
  "react-memoised-total": {
    title: "Memoizovaný součet",
    prompt: "Vykresli vyhledávací input, UL s objednávkami `orders` z výchozího kódu, jejichž název obsahuje dotaz bez ohledu na velikost písmen, a odstavec s textem „Total: <součet cen odpovídajících objednávek>“, takže prázdný dotaz ukáže všech šest s „Total: 585“ a „dive“ ukáže dvě s „Total: 180“. Přidej tlačítko s popiskem „Nudge“, které zvyšuje počítadlo zobrazené jako „Nudges: <n>“. Profiltrovaný seznam i jeho součet spočítej v jednom `useMemo`, které závisí jen na dotazu, aby překreslení vyvolané Nudge tuhle práci přeskočilo.",
    hints: ["useMemo dostane funkci, která vrátí profiltrovaný seznam se součtem, a pole závislostí jen s dotazem."],
    approach: [
      "Drž dotaz a počítadlo ve dvou useState a input navaž na dotaz.",
      "Filter i reduce zabal do useMemo s dotazem jako jedinou závislostí a vrať odpovídající objednávky i jejich součet.",
      "Seznam, součet a počítadlo vykresli z těchto hodnot; kliknutí na Nudge mění jen svůj vlastní stav.",
    ],
  },
  "react-stable-pick-handler": {
    title: "Stabilní obsluha výběru",
    prompt: "Vykresli odstavec s textem „Picked: none“ a pro každou příchuť z pole `flavours` ve výchozím kódu jedno tlačítko, které vykreslí potomek `FlavourButton` zabalený v `React.memo` s props `label` a `onPick`. Kliknutí předá popisek do `onPick` a odstavec ho ukáže, takže kliknutí na Mint dá „Picked: Mint“. Handler `onPick` vytvoř přes `useCallback` s prázdným polem závislostí, aby memoizovaní potomci dostávali při každém vykreslení stejnou funkci.",
    hints: ["Funkce vytvořená v těle komponenty je při každém vykreslení nová, zatímco useCallback bez závislostí vrací pokaždé tu samou."],
    approach: [
      "Drž vybraný popisek v useState s počáteční hodnotou none a odstavec z něj vykresli.",
      "Handler zabal do useCallback s prázdným polem závislostí; jen zavolá setter s popiskem, který dostane.",
      "Deklaruj FlavourButton mimo App, zabal ho do React.memo a namapuj na něj příchutě s popiskem a sdíleným handlerem.",
    ],
  },
  "react-undo-stack": {
    title: "Zásobník pro undo",
    prompt: "Vykresli tlačítko Push, tlačítko Undo, odstavec s textem „Depth: <n>“ a UL se zásobníkem odspodu nahoru. Zásobník spravuj přes `useReducer`: akce `push` přidá „Step <n>“, kde n je nová hloubka, a akce `pop` odebere poslední záznam. Undo je při prázdném zásobníku vypnuté (`disabled`), takže dva pushe a jedno undo nechají jen „Step 1“ s „Depth: 1“.",
    hints: ["Uvnitř reduceru pole nejdřív zkopíruj, na kopii zavolej push nebo pop a kopii vrať."],
    approach: [
      "Napiš reducer mimo komponentu; dostane aktuální pole a akci s typem.",
      "Pro push rozbal pole do kopie, na kopii pushni název dalšího kroku a vrať ji; pro pop stejně zkopíruj a popni.",
      "Tlačítka napoj na dispatch, hloubku odvoď z délky pole a Undo vypni, když je délka nula.",
    ],
  },
  "react-ticket-queue": {
    title: "Fronta lístků",
    prompt: "Vykresli tlačítko „Take a ticket“, tlačítko „Call next“, odstavec „Next up: <první lístek nebo none>“, odstavec „Waiting: <n>“ a UL s čekajícími lístky v pořadí. Frontu drž v `useReducer`: akce `enqueue` připojí „Ticket <n>“, kde n roste od 1 po celou dobu běhu, a akce `dequeue` odebere první lístek. Call next je vypnuté (`disabled`), když nikdo nečeká, takže tři odběry a jedno zavolání nechají Ticket 2 a Ticket 3 s „Next up: Ticket 2“.",
    hints: ["Ve stavu reduceru drž čekající seznam i počet vydaných lístků a před voláním shift si seznam zkopíruj."],
    approach: [
      "Napiš reducer mimo komponentu; jeho stav drží čekající lístky a počet dosud vydaných.",
      "Pro enqueue zvyš počet vydaných a do kopie seznamu připoj lístek pojmenovaný podle něj; pro dequeue seznam zkopíruj a na kopii zavolej shift.",
      "Next up odvoď z prvního lístku, Waiting z délky a Call next vypni, dokud je seznam prázdný.",
    ],
  },
  "react-usepagination-hook": {
    title: "Hook usePagination",
    prompt: "Napiš `usePagination(items, pageSize)`, hook, který drží aktuální stránku ve stavu a vrací položky té stránky, číslo stránky, počet stránek a funkce pro posun vpřed a zpět. Použij ho v App s polem `cities` z výchozího kódu a velikostí stránky 3: vykresli položky stránky jako UL, odstavec „Page 1 of 3“ a tlačítka Previous a Next, která jsou na první a poslední stránce vypnutá (`disabled`). Každou stránku vyřízni z pole přes `slice`.",
    hints: ["Začátek stránky najdeš vynásobením indexu stránky od nuly velikostí stránky a odtud vyřízneš jednu délku stránky."],
    approach: [
      "Deklaruj usePagination mimo App; uvnitř drž index stránky od nuly v useState.",
      "Počet stránek odvoď z počtu položek a velikosti stránky, viditelné položky z řezu, který začíná na indexu krát velikost stránky.",
      "Vrať viditelné položky, číslo stránky od jedné, počet stránek a funkce next a previous, které zůstanou v mezích.",
      "Zavolej hook v App s městy a hodnotou 3 a vykresli seznam, stavový řádek a obě tlačítka s příznaky disabled.",
    ],
  },
  "react-reorder-with-stable-keys": {
    title: "Přeskládání se stabilními klíči",
    prompt: "Vykresli `initialSteps` z výchozího kódu jako OL, kde každé LI ukazuje popisek ve spanu a tlačítka Up a Down; Up je u první položky vypnuté (`disabled`), Down u poslední. Přesun zkopíruje pole, prvním `splice` položku vyjme, druhým `splice` ji vloží o jednu pozici vedle a kopii uloží. Každé LI klíčuj podle `id` kroku, aby se při posunu Build dolů přesunul stejný element LI místo přepsání popisků, a pořadí bylo Plan, Test, Build, Ship.",
    hints: ["Jeden splice odebere položku na jejím indexu a vrátí ti ji, druhý ji v téže kopii vloží na sousední index."],
    approach: [
      "Drž kroky v useState naplněném z initialSteps a napiš jednu funkci move, která dostane index a směr.",
      "Uvnitř rozbal předchozí pole do kopie, přes splice vyjmi položku na indexu, druhým splice ji vlož na index plus směr a kopii vrať.",
      "Položky seznamu vykresli s key podle id, popiskem ve spanu a dvěma tlačítky; Up vypni na indexu nula a Down na posledním indexu.",
      "Spolehni se na key: protože sleduje id, React přesune existující uzel LI místo přepisování popisků na místě.",
    ],
  },
};
