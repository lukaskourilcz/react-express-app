/** Czech copy for D09. Arrays align by index with the English source; the
 * content test enforces parity, so a missing entry fails rather than falling
 * back silently to English. */

import type { ModuleCs } from '../../types';

export const DSA_D09_CS: ModuleCs = {
  title: 'Stromy a binární vyhledávací stromy',
  outcomes: [
    'Přečíst strom z uzlů `{ value, left, right }` a určit jeho velikost, výšku v hranách a hloubku libovolného uzlu v něm.',
    'Projít strom všemi čtyřmi způsoby — inorder, preorder, postorder a po hladinách — a vybrat ten, který úloha potřebuje.',
    'Hledat a vkládat v binárním vyhledávacím stromu v O(h) krocích a říct, proč je h výška, a ne log n.',
  ],
  lessons: {
    'dsa-v1-d09-l1': {
      title: 'Uzly, hrany a čtyři způsoby, jak projít strom',
      summary: 'Kořen, list, hloubka, výška a velikost, pak tři průchody do hloubky a fronta, která ti dá průchod po hladinách.',
      sections: [
        {
          body:
            'Binární strom se skládá z uzlů tvaru `{ value, left, right }`. `left` a `right` drží potomky a chybějící potomek je `null`. Celý modul stojí na jedné dohodě: strom je svůj kořenový uzel a `null` je prázdný strom. Opírá se o ni každá funkce níž, a proto mají všechny čtyři nebo pět řádků.',
        },
        {
          caption:
            'Ukázkový strom pro tuhle lekci. Hodnoty nejsou v žádném užitečném pořadí, což je v pořádku: tohle je binární strom, zatím ne vyhledávací.',
        },
        {
          body:
            'Uzel nahoře je kořen — 8, jediný uzel bez rodiče. `left` a `right` daného uzlu jsou jeho potomci a on je jejich rodič. Uzel bez potomků je list, takže listy jsou tady 9, 1 a 6. Každý uzel je zároveň kořenem podstromu: 3 spolu s 9 a 1 tvoří levý podstrom osmičky. Velikost stromu je počet jeho uzlů, tady 6.',
        },
        {
          body:
            'Tato cesta měří výšku v *hranách*, ne v uzlech. Hloubka uzlu je počet hran od kořene dolů k němu, takže kořen je v hloubce 0 a devítka v hloubce 2. Výška stromu je hloubka jeho nejhlubšího uzlu — nejdelší cesta z kořene do listu, opět v hranách. Jediný uzel má tedy výšku 0 a prázdný strom výšku -1. To -1 není trik k zapamatování: díky němu vyjde `height(node) = 1 + max(height(left), height(right))` pro list na 0, protože oba jeho chybějící potomci jsou prázdné stromy. Spousta učebnic počítá místo hran uzly a dává listu výšku 1, takže než uvedeš číslo, řekni, kterou dohodu používáš.',
        },
        {
          caption: 'Slovník, ověřený na ukázkovém stromu.',
          headers: ['Pojem', 'Co počítá', 'Na ukázkovém stromu'],
          rows: [
            ['Kořen', 'Jediný uzel bez rodiče', '8'],
            ['List', 'Uzel bez potomků', '9, 1 a 6'],
            ['Hloubka uzlu', 'Počet hran od kořene dolů k tomu uzlu', '9 je v hloubce 2, kořen v hloubce 0'],
            ['Výška stromu', 'Počet hran na nejdelší cestě z kořene do listu', '2, po cestě 8 → 3 → 9'],
            ['Velikost', 'Kolik uzlů strom drží', '6'],
            ['Podstrom', 'Libovolný uzel se vším, co je pod ním', '3, 9 a 1 tvoří levý podstrom osmičky'],
          ],
        },
        {
          body:
            'Výška je číslo, které předpovídá náklady. Cesta z kořene dolů do listu navštíví h + 1 uzlů, takže každá operace, která jde po jedné cestě dolů, stojí O(h). Velikost říká, kolik toho strom drží; výška říká, jak daleko musíš dojít na jeho konec. Ty dvě věci se můžou pořádně rozejít: šest uzlů se vejde do výšky 2 jako výš, nebo do výšky 5 v řetězu.',
        },
        {
          body:
            'Průchod navštíví každý uzel právě jednou. Ty do hloubky jdou po jedné větvi tak daleko, jak to jde, a teprve pak se vracejí. Tři z nich se liší jedinou věcí: kdy se zpracuje sám uzel vůči svým dvěma podstromům. Preorder zpracuje uzel první, inorder mezi podstromy, postorder až nakonec.',
        },
        { caption: 'Tři funkce, jeden přesunutý řádek. `push` je v každé z nich jinde a nic dalšího se nemění.' },
        {
          body:
            'Na ukázkovém stromu dá preorder 8, 3, 9, 1, 5, 6; inorder dá 9, 3, 1, 8, 5, 6; postorder dá 9, 1, 3, 6, 5, 8. Který z nich chceš, plyne z úlohy. Preorder se dostane k rodiči dřív než k potomkům, což potřebuje kopírování stromu nebo výpis do vnořeného značkování. Postorder dokončí oba podstromy před uzlem, což potřebuje rušení stromu, protože rodiče nemůžeš uvolnit, dokud na něm potomci pořád visí. Inorder je ten, na kterém stojí další lekce: pusť ho na binární vyhledávací strom a hodnoty vyjdou seřazené.',
        },
        {
          body:
            'Průchod po hladinách navštíví všechny uzly v hloubce 0, pak všechny v hloubce 1 a tak dál, zleva doprava uvnitř každé hladiny. Rekurze ti to nedá, protože zásobník volání jde dolů dřív než do stran. Fronta ano: vyber uzel zepředu, zaznamenej ho a jeho potomky dej dozadu. Cokoli už čeká, je blíž ke kořeni, takže odchází dřív, a hladiny vyjdou ve správném pořadí, aniž by kdokoli sledoval hloubku.',
        },
        {
          caption:
            'Průchod po hladinách s indexem hlavy: pole jen roste a odebrání zepředu posune index místo posouvání všech zbylých prvků.',
        },
        {
          body:
            '`queue.shift()` vypadá jako samozřejmé odebrání zepředu a stojí lineární průchod: každý zbylý prvek se posune o místo níž. Jednou na uzel to změní O(n) průchod na O(n²) na velkém stromu. Index hlavy výš drží každé odebrání na pevném počtu kroků a platí za to tím, že si celé pole podrží až do konce průchodu. Stejný průchod, jiné náklady, a ten rozdíl schovává právě to jednoslovné volání.',
        },
        {
          caption:
            'Průchod po hladinách na ukázkovém stromu. Každý snímek ukazuje frontu poté, co jeden uzel odešel zepředu a jeho potomci se zařadili dozadu.',
          notes: [
            'Fronta začíná samotným kořenem. Zatím nebylo nic zaznamenáno a vepředu je 8.',
            'Osmička odchází zepředu a je zaznamenána. Její potomci 3 a 5 se řadí dozadu, levý první. Zaznamenáno zatím: 8.',
            'Trojka odchází a je zaznamenána. Její potomci 9 a 1 se řadí dozadu za pětku, která čeká déle. Zaznamenáno zatím: 8, 3.',
            'Pětka odchází a je zaznamenána. Nemá levého potomka, takže dozadu jde jen 6. Zaznamenáno zatím: 8, 3, 5.',
            'Devítka odchází a je zaznamenána. Je to list, takže dozadu nejde nic a fronta se zkrátí. Zaznamenáno zatím: 8, 3, 5, 9.',
            'Jednička odchází a je zaznamenána, další list. Čeká už jen 6. Zaznamenáno zatím: 8, 3, 5, 9, 1.',
            'Šestka odchází a je zaznamenána. Fronta je prázdná, takže průchod končí. Celý průchod po hladinách je 8, 3, 5, 9, 1, 6 — hloubka 0, pak hloubka 1, pak hloubka 2.',
          ],
          counterLabels: [
            'Zaznamenané uzly',
            'Zaznamenané uzly',
            'Zaznamenané uzly',
            'Zaznamenané uzly',
            'Zaznamenané uzly',
            'Zaznamenané uzly',
            'Zaznamenané uzly',
          ],
        },
        {
          body:
            'Všechny čtyři průchody se dotknou každého uzlu jednou, takže všechny čtyři stojí O(n) času. Liší se v paměti navíc. Tři průchody do hloubky si půjčí O(h) rámců zásobníku, jeden na každý uzel cesty, po které jsou právě dole — to je O(log n) na vyváženém stromu a O(n) na řetězu, a přesně takhle hluboký rekurzivní průchod přeteče zásobník. Průchod po hladinách drží frontu širokou jako nejširší hladina, a spodní hladina vyváženého stromu drží zhruba polovinu uzlů, takže jeho paměť navíc je O(n), i když je strom nízký.',
        },
      ],
    },
    'dsa-v1-d09-l2': {
      title: 'Vyhledávací vlastnost a výška, kterou kupuje',
      summary: 'Co pravidlo binárního vyhledávacího stromu žádá u každého uzlu, proč hledání a vkládání stojí O(h) a proč h není log n, dokud strom někdo nedrží ve tvaru.',
      sections: [
        {
          body:
            'Binární vyhledávací strom přidává k binárnímu stromu jedno pravidlo. Pro každý uzel platí, že každá hodnota v jeho levém podstromu je menší než hodnota toho uzlu a každá hodnota v pravém podstromu není menší. Práci v té větě dělají dvě slova: *každý* uzel a celý *podstrom*, ne jen ti dva potomci, kteří na něm visí přímo.',
        },
        {
          caption:
            'Devět hodnot ve výšce 3. Všechno vlevo od 8 je menší než 8, všechno vpravo je větší, a totéž platí u 3, u 6, u 10 i u 14.',
        },
        {
          body:
            'Kontrolovat každý uzel jen proti jeho dvěma potomkům nestačí. Vezmi kořen 8 s levým potomkem 3 a dej té trojce pravého potomka 10. Každá dvojice rodič a potomek projde: 3 je menší než 8 a 10 je větší než 3. Vyhledávací strom to přesto není, protože 10 leží v levém podstromu osmičky, kde nic nesmí dosáhnout na 8. Ta škoda je skutečná, ne teoretická: hledání desítky zahne v kořeni doleva, jde od ní pryč a ohlásí, že tam není.',
        },
        {
          body:
            'Hledání začíná v kořeni a porovnává. Rovnost, a jsi hotov. Menší, a hodnota může být jen v levém podstromu, takže celý pravý podstrom vypadává, aniž by ses do něj jednou podíval. Větší, a je to zrcadlově. Každé porovnání zahodí jeden podstrom a posune tě o hranu níž, takže průchod navštíví nejvýš h + 1 uzlů a skončí na `null`, když hodnotu nikdo nedrží.',
        },
        {
          caption:
            'Hledání jako cyklus: jedno porovnání na hladinu, žádná rekurze a pevný počet referencí bez ohledu na výšku — O(1) paměti navíc.',
        },
        {
          body:
            'Na stromu výš přečte hledání sedmičky 8, zahne doleva na 3, doprava na 6 a doprava na 7: čtyři uzly z devíti. Hledání pětky přečte 8, 3, 6, 4 a pak najde `null` tam, kde by byl pravý potomek čtyřky, a po stejných čtyřech čteních ohlásí, že tam pětka není. Ani jeden z těch průchodů se na 10, 14 ani 13 vůbec nepodíval.',
        },
        {
          caption:
            'Průchod inorder přes sedmiuzlový vyhledávací strom. Buňky jsou uzly po hladinách; popisek u buňky je cesta k ní od kořene.',
          legend: ['kořen', 'L', 'R', 'L.L', 'L.R', 'R.L', 'R.R'],
          notes: [
            'Strom před průchodem. Kořen je 5, jeho levý podstrom drží 3 s potomky 2 a 4, pravý podstrom drží 8 s potomky 7 a 9. Zatím není nic zaznamenáno.',
            'Inorder zpracuje levý podstrom dřív než uzel, takže průchod jde přes 5 a 3 až k 2, aniž by je zaznamenal. Dvojka nemá levého potomka, takže se zaznamená jako první. Zaznamenáno: 2.',
            'Dvojka je hotová, takže se zaznamená její rodič 3. Všechno menší než 3 už vyšlo ven. Zaznamenáno: 2, 3.',
            'Pravý podstrom trojky je jediný uzel 4, který se zaznamená jako další. Zaznamenáno: 2, 3, 4.',
            'Celý levý podstrom kořene je hotový, takže se zaznamená kořen 5. Všechno zaznamenané zatím je menší než 5, protože levý podstrom drží přesně ty hodnoty, které menší jsou. Zaznamenáno: 2, 3, 4, 5.',
            'Průchod se přesune do pravého podstromu a sestoupí přes 8 k 7. Sedmička nemá levého potomka, takže se zaznamená. Zaznamenáno: 2, 3, 4, 5, 7.',
            'Sedmička je hotová, takže se zaznamená její rodič 8. Zaznamenáno: 2, 3, 4, 5, 7, 8.',
            'Devítka, pravý potomek osmičky, je poslední uzel a zaznamená se. Průchod končí s 2, 3, 4, 5, 7, 8, 9 — vzestupně, což je přesně to, co průchodu inorder kupuje vyhledávací vlastnost.',
          ],
        },
        {
          body:
            'Inorder vydá celý levý podstrom před uzlem a celý pravý podstrom po něm. Všechno v levém podstromu je menší a všechno v pravém není menší, takže kolem toho uzlu je výstup seřazený — a protože totéž platí u každého uzlu, je seřazený celý seznam. Tím dostaneš nejlevnější kontrolu správnosti, jakou máš: pusť průchod inorder a ověř, že žádná hodnota není menší než ta předchozí.',
        },
        {
          body:
            'Hledání i vkládání stojí O(h), protože obojí jde po jedné cestě dolů. Kolik h skutečně je, závisí čistě na tvaru. Dokonale vyvážený strom s 15 hodnotami má výšku 3, takže žádné hledání nepřečte víc než 4 uzly. Vlož do prázdného stromu 1 až 15 vzestupně a každá hodnota přistane vpravo od té předchozí: vyjde řetěz o výšce 14 a hledání patnáctky přečte všech 15 uzlů. Stejné hodnoty, stejná vlastnost, stejný kód, a buď 4 čtení, nebo 15, čistě podle pořadí, ve kterém dorazily.',
        },
        {
          caption: 'Patnáct hodnot v binárním vyhledávacím stromu, ve dvou tvarech.',
          headers: ['Tvar', 'Výška h', 'Uzlů, které přečte nejhorší hledání', 'Třída vzhledem k n'],
          rows: [
            ['Dokonale vyvážený', '3', '4', 'O(log n)'],
            ['Postavený vkládáním vzestupně', '14', '15', 'O(n)'],
            ['Cokoli mezi tím', 'Mezi 3 a 14', 'h + 1', 'O(h), což je poctivá odpověď'],
          ],
        },
        {
          caption:
            'Vkládání dojde na prázdné místo, kam hodnota patří, a pověsí tam nový list. Porovnání `value < node.value` posílá menší hodnoty doleva a všechno ostatní, větší i rovné, doprava.',
        },
        {
          body:
            'Tato cesta posílá hodnotu rovnou uzlu, u kterého zrovna stojíš, do pravého podstromu, a proto pravidlo výš říká „není menší“ místo „je větší“. Jiné kódové základny posílají rovné hodnoty doleva nebo si místo druhého uzlu drží na uzlu počítadlo, a všechny tři varianty se dají obhájit. Vyber si jednu a napiš to někam, protože hledání, vkládání i mazání se na tom musí shodnout. S rovnými hodnotami vpravo je průchod inorder neklesající, ne striktně rostoucí: dvě pětky vyjdou vedle sebe.',
        },
        {
          body:
            'Seřazený vstup je obvyklá cesta k řetězu a přichází nechtěně. Načteš záznamy už seřazené podle id a postavíš strom, který se vůbec nevětví, takže z očekávaného O(log n) je O(n). Vyvážené varianty, AVL a červeno-černé stromy, to řeší tím, že při vkládání otáčejí podstromy zpátky do tvaru, a leží mimo tuhle cestu. Tady je podstatné tohle: obyčejný BST ti dá O(h) a nic v té obyčejné verzi nedrží h malé.',
        },
        {
          body:
            'Shrnutí nákladů: hledání a vkládání jsou O(h) v čase a napsané jako cyklus potřebují O(1) paměti navíc, zatímco rekurzivní verze si půjčí O(h) zásobníku. Úplný průchod je O(n) bez ohledu na tvar, protože tak jako tak navštíví každý uzel. Nejmenší hodnotu najdeš tak, že jdeš doleva, dokud `left` není `null`, což je zase O(h) — levné na vyváženém stromu a úplný sken na řetězu.',
        },
      ],
    },
  },
  activities: {
    'dsa-v1-d09-l1-read': {
      title: 'Čtení: uzly, hrany a čtyři způsoby, jak projít strom',
      summary: 'Kořen, list, hloubka, výška v hranách a velikost, pak tři průchody do hloubky a průchod po hladinách na frontě.',
    },
    'dsa-v1-d09-l2-read': {
      title: 'Čtení: vyhledávací vlastnost a výška, kterou kupuje',
      summary: 'Pravidlo BST u každého uzlu, hledání a vkládání v O(h), pravidlo pro duplicity a proč je vychýlený strom řetěz.',
    },
    'dsa-v1-d09-checks': {
      title: 'Kontrola stromů a BST',
      summary: 'Čtyři otázky: výška jediného uzlu, jestli je strom vyhledávací, co stojí tvar a který průchod řadí.',
      questions: {
        'dsa-v1-d09-q1': {
          prompt:
            'Strom obsahuje přesně jeden uzel: `{ value: 7, left: null, right: null }`. Výška se počítá v hranách na nejdelší cestě z kořene do listu, tak jak ji počítá tato cesta. Jaká je výška a velikost toho stromu?',
          options: ['Výška 0 a velikost 1', 'Výška 1 a velikost 1', 'Výška 1 a velikost 0', 'Výška -1 a velikost 1'],
          explanation:
            'Pod jediným uzlem není žádná hrana, takže nejdelší cesta z kořene do listu má délku 0. Velikost počítá uzly a ten je jeden. Výška 1 je odpověď podle té druhé běžné dohody, která místo hran počítá uzly na cestě — existující dohoda, ale ne ta zdejší, a otázka říká, která platí. Velikost 0 popisuje prázdný strom, ne strom s uzlem uvnitř. Výška -1 je taky vyhrazená prázdnému stromu, který žádnou cestu z kořene do listu nemá.',
        },
        'dsa-v1-d09-q2': {
          prompt:
            'Platí pravidlo, že každá hodnota v levém podstromu uzlu je menší než ten uzel a každá hodnota v jeho pravém podstromu není menší. Je tohle binární vyhledávací strom?',
          options: [
            'Ne — 10 leží v levém podstromu osmičky a pravidlo se týká celého podstromu, ne jen přímých potomků.',
            'Ano — každý uzel má nejvýš dva potomky, což je to, co vyhledávací vlastnost žádá.',
            'Ano — každý uzel je větší než svůj levý potomek a menší než svůj pravý potomek, a to je celé pravidlo.',
            'Ne — trojce chybí levý potomek a vlastnost platí, až když má každý uzel oba potomky.',
          ],
          explanation:
            'Pravidlo platí pro každého potomka do hloubky, ne jen pro dva uzly visící na rodiči, a 10 je potomkem osmičky vlevo. Hledání desítky zahne v kořeni doleva a nikdy se k ní nedostane. Nejvýš dva potomci dělají z něčeho binární strom, což každý příklad v tomhle modulu už je; vyhledávací vlastnost je pravidlo navíc. Kontrola rodiče proti potomkovi je právě ta chyba, kterou lekce pojmenovává: 10 projde proti svému rodiči 3 a strom stejně rozbije. Chybějící potomci jsou běžní — 12 taky žádné nemá a strom by byl platný vyhledávací, kdyby tam 10 nebyla.',
        },
        'dsa-v1-d09-q3': {
          prompt:
            'Stejných 1 023 hodnot se načte do dvou binárních vyhledávacích stromů. Jeden vyjde dokonale vyvážený, druhý vznikl vkládáním hodnot vzestupně. Kolik uzlů přečte v každém z nich hledání v nejhorším případě?',
          options: [
            'Zhruba 10 uzlů u vyváženého a až 1 023 u vzestupně stavěného: náklady jsou O(h) a h je 9 v jednom tvaru a 1 022 ve druhém.',
            'Zhruba 10 uzlů v obou, protože vyhledávací vlastnost zaručuje O(log n) bez ohledu na pořadí vkládání.',
            '1 023 uzlů v obou, protože hledání musí být připravené navštívit každý uzel.',
            'Zhruba 10 uzlů u vyváženého a zhruba 32 u vzestupně stavěného, protože vychýlený strom stojí odmocninu z n.',
          ],
          explanation:
            'Vyvážený strom s 1 023 uzly má výšku 9 a cesta z kořene do listu přečte h + 1 = 10 uzlů. Vzestupné vkládání dá každou hodnotu vpravo od té předchozí, takže vznikne řetěz o výšce 1 022, kde poslední hodnota stojí všech 1 023 čtení. Samotná vyhledávací vlastnost o výšce nezaručuje nic — držet h blízko log n vyžaduje vyvažování, které obyčejný BST nedělá. Přečíst každý uzel popisuje úplný průchod, ne hledání: vyvážený případ opravdu v každém kroku zahodí polovinu zbytku stromu. A nic tady neroste jako odmocnina z n; ta třída se u hledání ve stromu neobjevuje.',
        },
        'dsa-v1-d09-q4': {
          prompt: 'Který průchod binárním vyhledávacím stromem vrátí hodnoty vzestupně?',
          options: [
            'Inorder: celý levý podstrom, pak uzel, pak celý pravý podstrom.',
            'Preorder: uzel, pak celý levý podstrom, pak celý pravý podstrom.',
            'Postorder: celý levý podstrom, pak celý pravý podstrom, pak uzel.',
            'Po hladinách: všechny uzly v hloubce 0, pak všechny v hloubce 1 a tak dál.',
          ],
          explanation:
            'Inorder vydá všechno menší než uzel před ním a všechno, co menší není, po něm, a to platí u každého uzlu, takže je seřazený celý výstup. Preorder vydá kořen jako první, což je nejmenší hodnota jen tehdy, když kořen nemá levý podstrom. Postorder vydá kořen jako poslední a selže stejně, jen na druhém konci. Průchod po hladinách seskupuje podle hloubky a hloubka nenese žádnou informaci o uspořádání: na devítiuzlovém stromu z lekce začíná 8, 3, 10.',
        },
      },
    },
    'dsa-v1-d09-height-and-size': {
      title: 'Výška a velikost',
      summary: 'Spočítej uzly a změř nejdelší cestu z kořene do listu v hranách, s prázdným stromem na -1.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, left, right }`. `left` a `right` drží potomky a chybějící potomek je `null`. Strom je svůj kořenový uzel, nebo `null`, když je prázdný.\n\nNapiš dvě funkce.\n\n`treeSize(root)` vrátí, kolik uzlů strom drží. `treeSize(null)` je 0.\n\n`treeHeight(root)` vrátí počet hran na nejdelší cestě z kořene dolů do listu. Jediný uzel má výšku 0, protože pod ním není žádná hrana. Prázdný strom má výšku -1, díky čemuž listu vyjde `1 + Math.max(-1, -1)`.\n\nStrom může být i řetěz — kořen, jehož jediný potomek má jednoho potomka a tak dál. Řetěz z pěti uzlů má velikost 5 a výšku 4.',
        contract: [
          'Strom neměň: žádné přiřazení do `value`, `left` ani `right`.',
          'Výška počítá hrany, ne uzly: jeden uzel je výška 0 a prázdný strom výška -1.',
          'Obě funkce přijmou `null` jako celý strom a potkají ho znovu u každého chybějícího potomka.',
          'Zvládni nesouměrný strom: o výšce rozhoduje ten vyšší z obou podstromů.',
        ],
        hints: [
          'Obě funkce mají stejný tvar: pro `null` odpověz rovnou a pak spoj odpovědi, které se vrátí z `left` a `right`. Chození obstará rekurze, ty píšeš to spojení.',
          'Výška je `1 + Math.max(leftHeight, rightHeight)`. S prázdným stromem na -1 vyjde listu `1 + Math.max(-1, -1)`, tedy 0 — žádný zvláštní případ není potřeba.',
          'Chybějící potomek je `null`, což je totéž jako prázdný strom. Proto jeden základní případ pokryje obojí.',
        ],
        approach: [
          'Vrať z `treeSize` nulu, když je kořen `null`; není co počítat.',
          'Jinak vrať 1 za tenhle uzel plus velikost levého a velikost pravého podstromu.',
          'Vrať z `treeHeight` -1, když je kořen `null`, aby list vyšel na 0.',
          'Jinak vezmi výšku obou podstromů a vrať o jedna víc než ta větší z nich.',
        ],
        testLabels: [
          '',
          'prázdný strom nemá žádné uzly',
          'prázdný strom má výšku -1',
          'jediný uzel má výšku 0',
          'řetěz z pěti uzlů má výšku 4',
          'řetěz nakloněný na druhou stranu',
          'o výšce rozhoduje vyšší podstrom',
        ],
      },
    },
    'dsa-v1-d09-traversals': {
      title: 'Čtyři průchody',
      summary: 'Inorder, preorder a postorder z rekurze a průchod po hladinách z fronty.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, left, right }`, chybějící potomek je `null` a strom je svůj kořenový uzel, nebo `null`, když je prázdný.\n\nNapiš čtyři funkce, každá vrátí pole hodnot v pořadí, ve kterém je navštíví.\n\n`inorder(root)` — celý levý podstrom, pak uzel, pak celý pravý podstrom.\n`preorder(root)` — uzel, pak levý podstrom, pak pravý podstrom.\n`postorder(root)` — levý podstrom, pak pravý podstrom, pak uzel.\n`levelOrder(root)` — všechny uzly v hloubce 0, pak všechny v hloubce 1 a tak dál, zleva doprava uvnitř každé hladiny.\n\nVšechny čtyři vrátí pro prázdný strom `[]` a pro jediný uzel jednoprvkové pole. Tři průchody do hloubky vypadnou z rekurze. `levelOrder` ne, protože zásobník volání jde dolů dřív než do stran: drž frontu, ber uzel zepředu, zaznamenej ho a jeho potomky dej dozadu.',
        contract: [
          'Z každé funkce vrať nové pole hodnot a strom nech beze změny.',
          'Každý uzel se v každém výsledku objeví právě jednou, včetně uzlů s jediným potomkem.',
          'Prázdný strom vrátí `[]` ze všech čtyř funkcí.',
          'Zaznamenávej hodnoty, ne uzly: v každém poli jsou čísla, ne objekty `{ value, left, right }`.',
        ],
        hints: [
          'Tři průchody do hloubky jsou jedna funkce s `push` na jiném místě. Napiš `preorder` a pak ten řádek přesuň mezi obě rekurzivní volání a za ně.',
          'Vnořená funkce `walk`, která uzavírá jedno pole `out`, udrží signaturu čistou a alokuje jedno pole na volání.',
          'U `levelOrder` nasaď do fronty kořen a drž index `head`. Dokud je `head` pod `queue.length`, přečti `queue[head]`, posuň `head` o jedna, zaznamenej hodnotu a přidej ty potomky, kteří nejsou `null`.',
        ],
        approach: [
          'Vrať rovnou `[]`, když je kořen `null`, ve všech čtyřech funkcích.',
          'Napiš nejdřív `preorder`: zaznamenej uzel, pak se zanoř do `left` a pak do `right`.',
          '`inorder` a `postorder` dostaneš přesunutím zaznamenávacího řádku mezi obě rekurzivní volání a pak za ně.',
          'U `levelOrder` drž frontu uzlů, které ještě čekají, nasazenou kořenem.',
          'Ber uzel zepředu, zaznamenej jeho hodnotu, přidej dozadu jeho potomky, kteří nejsou `null`, a skonči, až fronta dojde.',
        ],
        testLabels: [
          'inorder na ukázkovém stromu',
          'preorder začíná v kořeni',
          'postorder končí v kořeni',
          'po hladinách jde do stran dřív než dolů',
          'prázdný strom dá prázdné pole ze všech čtyř',
          'jediný uzel vyjde ve všech pořadích stejně',
          'řetěz nakloněný doprava',
        ],
      },
    },
    'dsa-v1-d09-bst-search-insert': {
      title: 'Hledání a vkládání v BST',
      summary: 'Vkládej po jedné cestě dolů s duplicitami doprava a hledej v hodnoceném rozpočtu h + 1 uzlů.',
      code: {
        prompt:
          'Uzel je obyčejný objekt `{ value, left, right }`, chybějící potomek je `null` a strom je svůj kořenový uzel, nebo `null`, když je prázdný. V binárním vyhledávacím stromu je každá hodnota v levém podstromu uzlu menší než hodnota toho uzlu a každá hodnota v jeho pravém podstromu není menší.\n\n`bstInsert(root, value)` uloží `value` tam, kam ji vlastnost žádá, a vrátí kořen stromu: ten kořen, který jsi dostal, nebo nový uzel, když byl strom prázdný. Hodnota rovná uzlu, u kterého zrovna stojíš, jde do pravého podstromu, nikdy do levého — to je pravidlo této cesty pro duplicity.\n\n`bstSearch(root, value)` vrátí uzel, který `value` drží, nebo `null`, když ji nedrží žádný. Musí jít po té vlastnosti: porovnej, sestup do jednoho podstromu a na druhý zapomeň. Hodnocení postaví vyvážený strom z 15 počítaných uzlů a zaznamená, kolika z nich se tvoje hledání dotklo. Rozpočet je 4, tedy výška plus jedna. Přečíst každý uzel ho překročí, i když je odpověď správná.',
        contract: [
          'Vkládej průchodem od kořene dolů a pověs nový list tam, kde se průchod zastaví; nestav strom znovu ze sesbíraného seznamu hodnot.',
          'Hodnota rovná uzlu, u kterého stojíš, jde do pravého podstromu.',
          '`bstInsert` vrací kořen — ten uzel, který jsi dostal, nebo nový uzel, když byl strom prázdný.',
          '`bstSearch` vrací uzel, který hodnotu drží, ne samotnou hodnotu, a `null`, když hodnota chybí.',
          '`bstSearch` se dotkne nejvýš h + 1 uzlů: 4 na hodnoceném vyváženém stromu s 15 uzly. Úplný průchod se dotkne všech 15 a to kritérium neprojde ani se správnou odpovědí.',
        ],
        hints: [
          'Vkládání jde dolů přesně tak jako hledání. Liší se tím, kde skončí: hledání skončí, když se hodnoty shodnou, vkládání skončí, když je potomek, do kterého by šlo, `null`, a pověsí tam nový uzel.',
          'Pravidlo pro duplicity vypadne z porovnání, které si vybereš. `value < node.value` posílá menší hodnoty doleva a všechno ostatní, větší i rovné, doprava.',
          '`bstSearch` vrací uzel, ne hodnotu: `return node` uvnitř cyklu a `return null` za ním, jakmile průchod vyjede pod strom.',
        ],
        approach: [
          'Vyřeš v `bstInsert` nejdřív prázdný strom: vrať nový uzel, protože se stane kořenem.',
          'Jinak jdi od kořene dolů, doleva při menší hodnotě a doprava jinak.',
          'Zastav se, když je potomek, do kterého bys šel, `null`, pověs tam nový uzel a vrať původní kořen.',
          'Napiš `bstSearch` jako tentýž průchod: vrať uzel, když se hodnoty shodnou, jinak se posuň do toho jediného podstromu, který hodnotu může držet.',
          'Vrať `null`, jakmile průchod dojde na `null`, což znamená, že hodnotu nedrží žádný uzel.',
        ],
        criteria: [
          {
            label: 'Správné vkládání a hledání včetně krajních případů',
            detail: 'Zkontroluj prázdný strom, duplicitní hodnotu, hodnotu, která tam není, a to, že hledání vrací uzel, ne hodnotu.',
          },
          {
            label: 'Hledání jde po jedné cestě z kořene dolů',
            detail:
              'Sonda postavila vyvážený strom z 15 počítaných uzlů a zaznamenala, kolika z nich se tvoje hledání dotklo. Rozpočet je 4, tedy výška plus jedna. Průchod celým stromem nebo sesbírání hodnot před hledáním se dotkne všech 15 a spadne sem, i když je vrácený uzel správný.',
          },
        ],
        testLabels: [
          'šest vložení přistane na správných místech',
          'vložení do prázdného stromu vytvoří kořen',
          'duplicita jde do pravého podstromu',
          'hledání najde uzel pod kořenem',
          'hodnota, která tam není, dá null',
          'hledání v prázdném stromu dá null',
          'patnáct uzlů, dotčené nejvýš čtyři',
        ],
      },
    },
  },
};
