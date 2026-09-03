// Czech copy for lib/coding/tasks/javascript.ts, keyed by task id. Arrays align by
// index with the English source; the content test enforces parity.

import type { CodingTaskCs } from '../types';

export const JAVASCRIPT_TASKS_CS: Record<string, CodingTaskCs> = {
  "js-double-numbers": {
    title: "Zdvojnásob čísla",
    prompt: "Napiš funkci `double(numbers)`, která vrátí nové pole, kde je každé číslo vynásobené dvěma. Prázdné pole dá prázdné pole; záporná čísla, nula i desetinná čísla se zdvojnásobí normálně.",
    hints: ["Map vrátí pro každou vstupní hodnotu jednu novou hodnotu."],
    approach: [
      "Sáhni po metodě map, protože pro každou vstupní hodnotu potřebuješ přesně jednu výstupní.",
      "V callbacku vrať číslo vynásobené dvěma; map ti návratové hodnoty sám poskládá do nového pole.",
    ],
    testLabels: ["", "", "prázdný vstup", "záporná čísla a nula", "desetinná čísla"],
  },
  "js-even-numbers": {
    title: "Sudá čísla",
    prompt: "Napiš funkci `evens(numbers)`, která vrátí nové pole jen se sudými hodnotami v původním pořadí. Nula je sudá, záporná čísla se posuzují stejně a pole bez sudých hodnot dá prázdné pole.",
    hints: ["Sudé číslo má po dělení dvěma zbytek 0."],
    approach: [
      "Sáhni po metodě filter, protože některé hodnoty necháváš a jiné zahazuješ, nic nepřetváříš.",
      "Sudost urči operátorem zbytku po dělení: sudé číslo dělené dvěma nechá zbytek nula. Dej pozor, že nula sem patří taky.",
    ],
    testLabels: ["", "", "prázdný vstup", "nic nevyhovuje", "nula a záporná čísla"],
  },
  "js-sum-array": {
    title: "Součet pole",
    prompt: "Napiš funkci `sum(numbers)`, která vrátí součet všech hodnot. Prázdné pole dá 0, záporná a desetinná čísla se sčítají jako kterákoli jiná.",
    hints: ["Skládáš spoustu hodnot do jedné, takže sáhni po metodě, která je přesně na to stavěná, a dej jí počáteční součet, jinak prázdné pole nemá co vrátit."],
    approach: [
      "Použij reduce s akumulátorem, který nese průběžný součet.",
      "Začni akumulátor na nule, což je zároveň to, co musí vrátit prázdné pole.",
      "Každý krok vrátí průběžný součet plus aktuální číslo.",
    ],
    testLabels: ["", "", "prázdný vstup vrátí 0", "záporná čísla se vyruší", "desetinná čísla"],
  },
  "js-longest-word": {
    title: "Nejdelší slovo",
    prompt: "Napiš funkci `longest(words)`, která vrátí nejdelší řetězec v poli. Když jsou dva stejně dlouhé, nech ten, který je v poli dřív; prázdné pole vrátí prázdný řetězec.",
    hints: ["Projdi seznam a drž si zatím nejlepšího kandidáta; nahraď ho jen tehdy, když je nové slovo ostře delší. Právě to „ostře“ nechá při shodě vyhrát dřívější slovo."],
    approach: [
      "Sleduj zatím nejlepšího kandidáta, buď v proměnné cyklu, nebo jako akumulátor reduce.",
      "Průběžně porovnávej délky a nejlepšího nahraď jen tehdy, když je aktuální slovo ostře delší, takže při shodě zůstane první.",
      "Ještě než napíšeš cyklus, rozhodni, co vrátí prázdný seznam; prázdný řetězec je tu přirozená odpověď.",
    ],
    testLabels: ["", "", "jediné slovo", "prázdný vstup vrátí prázdný řetězec", "při shodě zůstane první"],
  },
  "js-count-vowels": {
    title: "Spočítej samohlásky",
    prompt: "Napiš funkci `countVowels(text)`, která vrátí, kolik samohlásek (a, e, i, o, u) řetězec obsahuje. Velké samohlásky se počítají taky; řetězec bez samohlásek nebo prázdný řetězec dá 0.",
    hints: ["Projdi písmena převedená na malá a u každého ověř, jestli je v \"aeiou\"."],
    approach: [
      "Nejdřív text převeď na malá písmena, aby se velké samohlásky počítaly stejně.",
      "Projdi znaky a u každého ověř, jestli patří mezi pět samohlásek; stačí řetězec samohlásek a includes.",
      "Vrať počet shod, ne shody samotné.",
    ],
    testLabels: ["", "", "prázdný řetězec", "velká písmena se počítají taky", "žádné samohlásky"],
  },
  "js-reverse-string": {
    title: "Obrať řetězec",
    prompt: "Napiš funkci `reverse(text)`, která vrátí řetězec se znaky v opačném pořadí. Mezery jsou znaky jako každé jiné a prázdný nebo jednoznakový řetězec se vrátí beze změny.",
    hints: ["Každé písmeno přidávej na začátek výsledného řetězce."],
    approach: [
      "Rozděl řetězec na znaky, protože samotný řetězec na místě obrátit nejde.",
      "Pole znaků obrať a spoj zpátky do řetězce.",
      "Ověř, že prázdný řetězec i jediný znak přežijí cestu tam a zpět.",
    ],
    testLabels: ["", "", "prázdný řetězec", "jediný znak", "zachová mezery"],
  },
  "js-positive-numbers": {
    title: "Kladná čísla",
    prompt: "Napiš funkci `positives(numbers)`, která vrátí nové pole s hodnotami ostře většími než nula, v původním pořadí. Nula kladná není a pole bez kladných hodnot dá prázdné pole.",
    hints: ["U každé hodnoty rozhoduješ nechat, nebo zahodit; jediná záludnost je hranice: nula není větší než nula."],
    approach: [
      "Použij filter s testem na ostře větší než nula.",
      "Pamatuj, že nula není kladná, takže musí vypadnout spolu se zápornými čísly.",
    ],
    testLabels: ["", "", "prázdný vstup", "nula není kladná", "nic nevyhovuje"],
  },
  "js-square-numbers": {
    title: "Druhé mocniny",
    prompt: "Napiš funkci `squares(numbers)`, která vrátí nové pole, kde je každé číslo vynásobené samo sebou. Záporné číslo dá po umocnění kladné; nula a desetinná čísla se umocní normálně.",
    hints: ["Jeden výstup na každý vstup a druhá mocnina je jen číslo vynásobené samo sebou, stejný tvar jako zdvojnásobení."],
    approach: [
      "Použij map, protože každý vstup dává přesně jeden výstup.",
      "Každé číslo vynásob samo sebou, nebo použij operátor umocnění. Nezapomeň, že záporný vstup dá kladný výsledek.",
    ],
    testLabels: ["", "", "prázdný vstup", "záporné dá kladné", "nula a desetinná čísla"],
  },
  "js-largest-number": {
    title: "Největší číslo",
    prompt: "Napiš funkci `largest(numbers)`, která vrátí největší hodnotu v poli. Musí fungovat, i když jsou všechny hodnoty záporné a když se maximum vyskytuje víckrát. Předpokládej aspoň jedno číslo.",
    hints: ["Každou hodnotu porovnej s dosud největší."],
    approach: [
      "Buď si v cyklu drž dosud největší hodnotu, nebo pole rozbal spreadem do Math.max.",
      "Ověř, že porovnání funguje, i když jsou všechny hodnoty záporné; začínat od nuly by bylo špatně.",
    ],
    testLabels: ["", "", "jediná hodnota", "samá záporná čísla", "duplicity"],
  },
  "js-fizz-values": {
    title: "Hodnoty Fizz",
    prompt: "Napiš funkci `fizz(n)`, která vrátí pole s čísly od 1 do n, kde je každý násobek 3 nahrazený řetězcem `Fizz`: `fizz(5)` dá `[1, 2, “Fizz”, 4, 5]`. `fizz(0)` dá prázdné pole.",
    hints: ["Počítej od 1 do n a u každého čísla nejdřív rozhodni, jestli je dělitelné třemi, a teprve potom, co dát do pole."],
    approach: [
      "Nejdřív vytvoř čísla od jedné do n a teprve pak je přetvoř.",
      "U každého čísla vrať slovo Fizz, když je beze zbytku dělitelné třemi, a jinak číslo samotné.",
      "Zkontroluj kraje: n rovné nule nedá nic a násobek tří na konci musí být nahrazený taky.",
    ],
    testLabels: ["", "", "nula nedá nic", "pod prvním násobkem", "končí na násobku"],
  },
  "js-countdown": {
    title: "Odpočet",
    prompt: "Napiš funkci `countDown(n)`, která vrátí pole s odpočtem od n do 1: `countDown(3)` dá `[3, 2, 1]`. `countDown(0)` dá prázdné pole.",
    hints: ["Přidej n do pole a snižuj ho, dokud je kladné."],
    approach: [
      "Použij cyklus while, který běží, dokud je n kladné.",
      "Nejdřív aktuální hodnotu přidej a pak ji sniž, takže první přidaná hodnota je n a poslední jednička.",
      "Ověř, že nula dá prázdné pole místo nekonečného cyklu.",
    ],
    testLabels: ["", "", "jediný krok", "nula nedá nic"],
  },
  "js-first-letters": {
    title: "První písmena",
    prompt: "Napiš funkci `firstLetters(words)`, která vrátí pole prvních znaků jednotlivých slov, v původním pořadí a s původní velikostí písmen.",
    hints: ["Zase jeden výstup na jeden vstup: z každého slova zbude jen jeho první znak a řetězec jde indexovat stejně jako pole."],
    approach: [
      "Použij map, který za každé slovo v seznamu vrátí přesně jedno písmeno.",
      "Z každého slova vyber znak na prvním indexu a nech mu původní velikost, nic neměň.",
    ],
    testLabels: ["", "", "prázdný vstup", "jediné slovo", "zachová velikost písmen"],
  },
  "js-has-adult": {
    title: "Je tu dospělý",
    prompt: "Napiš funkci `hasAdult(ages)`, která vrátí true, když je aspoň jeden věk 18 nebo víc. Přesně 18 se počítá; prázdné pole dá false.",
    hints: ["Potřebuješ jen vědět, jestli vyhovuje jediný věk, takže odpověď je boolean a hledání může skončit hned u první shody."],
    approach: [
      "Použij some, který se zastaví u první shody a vrátí boolean.",
      "Podmínka je aspoň osmnáct, takže osmnáctka samotná se musí počítat.",
      "Pamatuj, že some nad prázdným polem dá false, což je přesně odpověď, kterou chceš.",
    ],
    testLabels: ["", "", "", "přesně 18 se počítá", "prázdný vstup dá false"],
  },
  "js-all-positive": {
    title: "Všechna kladná",
    prompt: "Napiš funkci `allPositive(numbers)`, která vrátí true jen tehdy, když je každá hodnota větší než nula. Nula znamená false a prázdné pole dá true.",
    hints: ["Opačná otázka než minule: vyhovět musí každá hodnota. Rozmysli si, co to znamená pro seznam, ve kterém není nic, co by mohlo selhat."],
    approach: [
      "Použij every, který se zastaví u prvního selhání a vrátí boolean.",
      "Podmínka je ostře větší než nula, takže nula shodí celý výsledek na false.",
      "Všimni si, že every nad prázdným polem dá true; tady je to správně, ne chyba.",
    ],
    testLabels: ["", "", "prázdný vstup je triviálně true", "nula není kladná", "jediná hodnota"],
  },
  "js-total-price": {
    title: "Celková cena",
    prompt: "Napiš funkci `total(items)`, která vrátí součet `price` všech položek. Prázdné pole dá 0 a desetinné ceny se sčítají normálně.",
    hints: ["Stejné skládání do jedné hodnoty jako u součtu čísel, jen sčítané číslo je vlastností každého objektu."],
    approach: [
      "Použij reduce s číselným akumulátorem, který začíná na nule.",
      "Přičítej vlastnost price každé položky, ne položku samotnou.",
    ],
    testLabels: ["", "", "prázdný vstup vrátí 0", "nulová cena", "desetinné ceny"],
  },
  "js-capitalize": {
    title: "Velké první písmeno",
    prompt: "Napiš funkci `capitalize(text)`, která vrátí řetězec jen s prvním znakem převedeným na velké písmeno a zbytkem beze změny: z `hello world` je `Hello world`. Prázdný řetězec se vrátí prázdný.",
    hints: ["Spoj první znak převedený na velké písmeno se slice(1)."],
    approach: [
      "Vezmi první znak, převeď ho na velké písmeno a připoj k němu zbytek řetězce od indexu jedna.",
      "Nejdřív ošetři prázdný řetězec, protože znak na indexu nula z prázdného řetězce dá undefined.",
    ],
    testLabels: ["", "", "prázdný řetězec", "jediný znak", "už začíná velkým písmenem"],
  },
  "js-unique-values": {
    title: "Unikátní hodnoty",
    prompt: "Napiš funkci `unique(values)`, která vrátí nové pole bez duplicit, kde každá hodnota zůstane na místě, kde se objevila poprvé. Funguje pro řetězce i čísla.",
    hints: ["Vytvoř Set a rozbal ho do pole."],
    approach: [
      "Vlož hodnoty do Setu, který duplicity zahodí a zachová pořadí prvního výskytu.",
      "Set rozbal spreadem zpátky do pole, aby návratový typ odpovídal vstupu.",
    ],
    testLabels: ["", "", "prázdný vstup", "zachová pořadí prvního výskytu", "i řetězce"],
  },
  "js-word-count": {
    title: "Počet slov",
    prompt: "Napiš funkci `wordCount(sentence)`, která vrátí, kolik slov věta obsahuje. Bílé znaky na krajích se nepočítají, opakované mezery mezi slovy nevytvářejí slova navíc a prázdný řetězec dá 0.",
    hints: ["Nejdřív ořízni kraje, pak rozhodni, co odděluje jedno slovo od druhého, a ověř, co se stane, když jsou dvě mezery vedle sebe."],
    approach: [
      "Větu nejdřív ořízni, aby mezery na začátku a na konci nevytvořily prázdná slova.",
      "Rozděluj podle jednoho či více bílých znaků, ne podle jedné mezery, aby opakované mezery nenafoukly počet.",
      "Prázdný řetězec ošetři zvlášť: jeho rozdělením vznikne jedna prázdná položka, ne nula slov.",
    ],
    testLabels: ["", "", "prázdný řetězec vrátí 0", "bílé znaky na krajích", "opakované mezery"],
  },
  "js-find-user": {
    title: "Najdi uživatele",
    prompt: "Napiš funkci `findUser(users, name)`, která vrátí první objekt uživatele, jehož `name` odpovídá. Když nic neodpovídá nebo je seznam prázdný, vrať `undefined`.",
    hints: ["Chceš první prvek, který vyhovuje, a metoda pole, která to umí, sama vrátí undefined, když nevyhovuje nic, takže žádné další ošetření není potřeba."],
    approach: [
      "Použij find, který vrátí první vyhovující prvek, ne pole.",
      "Porovnej vlastnost name každého uživatele s hledaným jménem.",
      "Řekni si, co se stane, když nic neodpovídá: find vrátí undefined a to je přesně očekávaná odpověď.",
    ],
    testLabels: ["", "", "bez shody vrátí undefined", "prázdný seznam"],
  },
  "js-odd-sum": {
    title: "Součet lichých",
    prompt: "Napiš funkci `oddSum(numbers)`, která vrátí součet jen lichých hodnot. Záporná lichá čísla se počítají; bez lichých hodnot nebo u prázdného pole je součet 0.",
    hints: ["Dva kroky za sebou: rozhodni, které hodnoty vyhovují, a ty pak slož do jednoho součtu, který začíná od nuly."],
    approach: [
      "Nejdřív pomocí filter vyber liché hodnoty a pak je pomocí reduce sečti.",
      "Lichost testuj nenulovým zbytkem po dělení, aby se započítala i záporná lichá čísla.",
      "Reduce začni na nule, aby prázdný výsledek dal součet nula.",
    ],
    testLabels: ["", "", "prázdný vstup vrátí 0", "žádné liché hodnoty", "záporná lichá se počítají"],
  },
  "js-repeat-word": {
    title: "Opakuj slovo",
    prompt: "Napiš funkci `repeat(word, times)`, která vrátí slovo zopakované tolikrát, kolik je zadáno, s jednou mezerou mezi opakováními: `repeat(“hi”, 3)` dá `hi hi hi`. Jednou znamená bez mezery a nulakrát dá prázdný řetězec.",
    hints: ["Nejdřív vytvoř jednotlivé kusy a oddělovače mezi ně nech dát spojování, místo abys pokaždé přidával mezeru a na konci jednu odřezával."],
    approach: [
      "Vytvoř kolekci n kopií slova a pak ji spoj.",
      "Spojuj jednou mezerou, která oddělovače dá mezi kopie, ne kolem nich, takže jediná kopie nemá mezeru žádnou.",
    ],
    testLabels: ["", "", "jednou znamená bez mezery", "nula opakování"],
  },
  "js-number-range": {
    title: "Rozsah čísel",
    prompt: "Napiš funkci `range(start, end)`, která vrátí všechna celá čísla od start po end, obě včetně. Start se může rovnat end a záporný start funguje stejně.",
    hints: ["Počítej od start nahoru, dokud jsi nepřešel end. Celé cvičení je o hranici, protože end je součástí výsledku."],
    approach: [
      "Než rozsah postavíš, spočítej, kolik hodnot obsahuje: end minus start, plus jedna.",
      "Hodnoty vytvářej přičítáním indexu ke start, aby záporný start fungoval stejně.",
      "Použij porovnání včetně rovnosti, aby koncová hodnota byla součástí výsledku.",
    ],
    testLabels: ["", "", "start se rovná end", "záporný start"],
  },
  "js-average": {
    title: "Průměr",
    prompt: "Napiš funkci `average(numbers)`, která vrátí průměr hodnot v poli. Prázdné pole vrátí 0, ne NaN.",
    hints: ["Průměr je součet dělený počtem, takže jediné skutečné rozhodnutí je, co vrátit, když je počet nula."],
    approach: [
      "Sečti hodnoty pomocí reduce a výsledek vyděl jejich počtem.",
      "Před dělením ošetři prázdné pole, protože dělení nulovou délkou dá NaN.",
    ],
    testLabels: ["", "", "jediná hodnota", "prázdný vstup vrátí 0", "záporná čísla"],
  },
  "js-short-words": {
    title: "Krátká slova",
    prompt: "Napiš funkci `shortWords(words)`, která vrátí jen slova kratší než pět znaků. Čtyři znaky projdou, pět ne.",
    hints: ["U každého slova rozhoduješ podle délky nechat, nebo zahodit. Pozorně si přečti hranici: čtyři znaky projdou, pět ne."],
    approach: [
      "Použij filter a slovo nech jen tehdy, když jeho délka projde porovnáním.",
      "Na hranici záleží: projde ostře méně než pět znaků, takže čtyřpísmenné slovo zůstane a pětipísmenné ne.",
    ],
    testLabels: ["", "", "prázdný vstup", "čtyři znaky projdou", "pět znaků je moc"],
  },
  "js-object-keys": {
    title: "Klíče objektu",
    prompt: "Napiš funkci `keys(object)`, která vrátí pole názvů vlastních klíčů objektu v pořadí, v jakém byly vloženy. Prázdný objekt dá prázdné pole.",
    hints: ["JavaScript ti názvy vlastních klíčů objektu dává jako pole už hotové; otázka je, která vestavěná funkce vrací názvy, a ne to, co je pod nimi uložené."],
    approach: [
      "Object.keys vrátí názvy vlastností jako pole.",
      "Ověř, že prázdný objekt dá prázdné pole, ne undefined.",
    ],
    testLabels: ["", "", "prázdný objekt", "jediný klíč"],
  },
  "js-object-values": {
    title: "Hodnoty objektu",
    prompt: "Napiš funkci `values(object)`, která vrátí pole hodnot objektu v pořadí, v jakém byly vloženy. `null` je hodnota jako každá jiná; prázdný objekt dá prázdné pole.",
    hints: ["Stejná rodina vestavěných funkcí jako v minulé úloze, jen tentokrát chceš to, co je uložené, a ne to, pod čím je to uložené."],
    approach: [
      "Object.values vrátí hodnoty vlastností jako pole.",
      "Pamatuj, že null je skutečná hodnota a musí ve výsledku zůstat.",
    ],
    testLabels: ["", "", "prázdný objekt", "null je hodnota"],
  },
  "js-activate-user": {
    title: "Aktivuj uživatele",
    prompt: "Napiš funkci `activate(user)`, která vrátí nový objekt se stejnými vlastnostmi a navíc `active: true`. Původní objekt se nesmí změnit a případné `active: false` se přepíše.",
    hints: ["Postav nový objekt místo přiřazování do toho, který jsi dostal, a příznak napiš až za zkopírované vlastnosti, aby vyhrál, když se sejdou oba."],
    approach: [
      "Původní objekt rozbal spreadem do nového místo přiřazování do původního, aby vstup zůstal netknutý.",
      "Příznak active napiš až za spread, aby existující hodnotu přepsal, místo aby byl přepsán sám.",
    ],
    testLabels: ["", "", "prázdný objekt", "přepíše existující active"],
  },
  "js-palindrome": {
    title: "Palindrom",
    prompt: "Napiš funkci `isPalindrome(text)`, která vrátí true, když se řetězec čte stejně pozpátku. Předpokládej jen malá písmena; prázdný řetězec i jediný znak jsou palindromy.",
    hints: ["Porovnej slovo s jeho obrácenou verzí."],
    approach: [
      "Slovo obrať stejnou cestou jako v úloze s obracením řetězce: rozděl, obrať, spoj.",
      "Obrácené slovo porovnej s původním a výsledek porovnání rovnou vrať.",
      "Všimni si, že prázdný řetězec i jediný znak jsou palindromy.",
    ],
    testLabels: ["", "", "", "prázdný řetězec je palindrom", "jediný znak"],
  },
  "js-letter-counts": {
    title: "Počty písmen",
    prompt: "Napiš funkci `countLetters(text)`, která vrátí objekt mapující každý znak na počet jeho výskytů: `countLetters(“aba”)` dá `{ a: 2, b: 1 }`. Prázdný řetězec dá prázdný objekt.",
    hints: ["Procházej znaky a průběžně skládej objekt; se znakem, který jsi ještě neviděl, zacházej, jako by jeho počet už byl nula."],
    approach: [
      "Při průchodu znaky skládej objekt, pomocí reduce nebo cyklu.",
      "U každého písmene přečti dosavadní počet, nebo použij nulu, a ulož o jedna víc.",
      "Počáteční hodnota je prázdný objekt, což je zároveň to, co vrátí prázdný řetězec.",
    ],
    testLabels: ["", "", "prázdný řetězec dá prázdný objekt", "jediné písmeno", "opakování se sčítají"],
  },
  "js-flatten-arrays": {
    title: "Zploštění polí",
    prompt: "Napiš funkci `flatten(arrays)`, která vrátí jedno pole s položkami všech vnitřních polí, v pořadí. Zplošťuj jen jednu úroveň a obejdi se bez `Array.prototype.flat`.",
    hints: ["Použij reduce a každé vnitřní pole připoj k výsledku."],
    approach: [
      "Vnější pole slož pomocí reduce do jediného výsledného pole.",
      "V každém kroku připoj vnitřní pole k akumulátoru; spread to zvládne a akumulátor přitom nemění na místě.",
      "Začni od prázdného pole, aby se prázdný vstup i prázdné vnitřní pole chovaly správně.",
    ],
    testLabels: ["", "", "prázdný vstup", "prázdné vnitřní pole", "jediné vnitřní pole"],
  },
  "js-call-once": {
    title: "Jen jednou",
    prompt: "Napiš funkci `once(fn)`, která vrátí obalenou funkci spouštějící `fn` nejvýš jednou. Každé další volání vrátí ten první výsledek (i když je falsy), aniž by `fn` zavolalo znovu, a každý obal si pamatuje ten svůj.",
    hints: ["V closure si drž příznak, že už proběhlo, a první výsledek."],
    approach: [
      "V closure si drž dvě věci: příznak, jestli už volání proběhlo, a hodnotu, kterou dalo.",
      "Při každém volání nejdřív zkontroluj ten příznak: jen dokud není nastavený, spusť obalenou funkci a ulož, co vrátila.",
      "Uloženou hodnotu vrať v obou případech, takže druhý i třetí volající dostanou první odpověď a práce se nikdy neopakuje.",
    ],
    testLabels: ["", "", "", "falsy první výsledek se pamatuje taky", "každý obal má vlastní paměť"],
  },
  "js-counter-object": {
    title: "Objekt počítadla",
    prompt: "Napiš funkci `makeCounter()`, která vrátí objekt počítadla. `increment` a `reset` mění počet a vracejí počítadlo, takže volání jde řetězit; `value()` vrátí aktuální počet, který začíná na 0. Dvě počítadla nikdy nesdílejí počet.",
    hints: ["Drž počet v closure a vrať metody, které ho čtou a mění."],
    approach: [
      "Počet drž v proměnné uvnitř továrny, kam se zvenku nedostane nic kromě metod, které vracíš.",
      "Nech increment a reset tu proměnnou změnit a pak vrátit tentýž objekt; právě to umožňuje volání řetězit.",
      "Nech value číst proměnnou ve chvíli, kdy se na ni někdo ptá, místo abys číslo zkopíroval při vytváření objektu.",
    ],
    testLabels: ["", "", "nové počítadlo začíná na nule", "reset vynuluje počet", "po resetu se počítá dál", "každé počítadlo má vlastní počet"],
  },
  "js-debounce-calls": {
    title: "Debounce volání",
    prompt: "Napiš funkci `debounce(fn, waitMs)`, která vrátí debouncovanou funkci. Každé volání restartuje časovač, takže z dávky proběhne jen poslední volání, `waitMs` po něm a s jeho argumenty. Dvě debouncované funkce mají oddělené časovače.",
    hints: ["S každým novým voláním zruš čekající časovač."],
    approach: [
      "Id čekajícího časovače drž v closure, protože další volání se k němu musí dostat.",
      "Každé volání zruší časovač, který už čeká, a naplánuje nový, takže dávka volání posouvá spuštění pořád dál.",
      "Spuštění naplánuj s argumenty volání, které ho naplánovalo; proto se prosadí poslední volání z dávky.",
    ],
    testLabels: ["", "", "o argumentech rozhodne poslední volání", "během dávky nic neběží", "dvě debouncované funkce mají oddělené časovače"],
  },
  "js-throttle-calls": {
    title: "Throttle volání",
    prompt: "Napiš funkci `throttle(fn, waitMs)`, která vrátí throttlovanou funkci s náběžnou hranou: první volání proběhne hned a každé volání během následujících `waitMs` se zahodí, místo aby se přehrálo později. Dvě throttlované funkce mají oddělená okna.",
    hints: ["Pamatuj si, kdy proběhlo poslední spuštění, a porovnej to s aktuálním časem."],
    approach: [
      "Čas posledního spuštění drž v closure a začni dost hluboko v minulosti, aby už první volání prošlo.",
      "Při každém volání porovnej aktuální čas s tou značkou: jakmile okno uplyne, spusť funkci a značku aktualizuj, jinak volání zahoď.",
      "Zahozená volání se zapomínají, ne řadí do fronty, takže po otevření okna je nic nepřehraje.",
    ],
    testLabels: ["", "", "zahozené volání se nikdy nepřehraje", "první volání proběhne bez čekání", "každá throttlovaná funkce má vlastní okno"],
  },
  "js-sleep": {
    title: "Sleep",
    prompt: "Napiš funkci `sleep(ms)`, která vrátí promise vyřešenou po `ms` milisekundách bez hodnoty. Nulové čekání se vyřeší taky.",
    hints: ["Obal setTimeout do promise a vyřeš ji z callbacku."],
    approach: [
      "Promise vrať hned a její funkci resolve předej časovači, aby se promise vyřešila, až časovač doběhne.",
      "Do resolve nic nepředáváš, proto z await nedostaneš žádnou hodnotu; smyslem je samotné čekání.",
      "Protože čekání sedí na časovači, zbytek programu běží dál, místo aby se zablokoval.",
    ],
    testLabels: ["", "", "", "nulové čekání se vyřeší taky", "vyřeší se bez hodnoty"],
  },
  "js-retry-on-failure": {
    title: "Opakuj při selhání",
    prompt: "Napiš funkci `retry(fn, attempts)`, která volá asynchronní `fn`, dokud se nevyřeší nebo nedojde rozpočet pokusů. Vyřeš se prvním úspěchem; když selžou všechny pokusy, odmítni s poslední chybou, ne s první.",
    hints: ["Projdi pokusy v cyklu a vrať výsledek, jakmile se některý vyřeší."],
    approach: [
      "Pokusy procházej cyklem, ne rekurzí, a volání dej do try, aby odmítnutí z cyklu neuteklo.",
      "Jakmile se pokus vyřeší, hned vrať výsledek; tím opustíš cyklus a přeskočíš pokusy, které už nepotřebuješ.",
      "Chybu z každého selhání si uchovej, abys po vyčerpání pokusů mohl vyhodit tu poslední místo prázdného selhání.",
    ],
    testLabels: ["", "", "", "po vyčerpání pokusů skončí", "jeden pokus stačí, když vyjde"],
  },
  "js-clone-promise-all": {
    title: "Klon Promise.all",
    prompt: "Napiš funkci `promiseAll(promises)`, která se vyřeší se všemi hodnotami v pořadí vstupu, nebo se odmítne, jakmile se odmítne kterýkoli vstup. Obyčejné hodnoty, které nejsou promise, jsou povolené, prázdné pole se vyřeší na prázdné pole a `Promise.all` volat nesmíš.",
    hints: ["Každou hodnotu ulož podle jejího indexu a vyřeš se, až dorazí všechny."],
    approach: [
      "Vrať novou promise a uvnitř si drž pole pro výsledky a počet těch, které už dorazily.",
      "Postupně se přihlas k odběru každého vstupu a jeho hodnotu zapiš do výsledků na index, na kterém přišel, aby pořadí výstupu odpovídalo vstupu.",
      "Vyřeš se teprve tehdy, když počet došlých dosáhne délky vstupu, a každé odmítnutí předej rovnou dál, aby první selhání ukončilo všechno.",
      "Dej pozor na prázdný vstup: není na co čekat, počet se nikdy nepohne, takže se vyřeš ještě před přihlašováním k odběru.",
    ],
    testLabels: ["", "", "", "obyčejné hodnoty jsou povolené", "vůbec žádné promise"],
  },
  "js-run-tasks-in-order": {
    title: "Úlohy popořadě",
    prompt: "Napiš funkci `runSequentially(tasks)`, která volá pole asynchronních funkcí jednu po druhé, nikdy paralelně, a vyřeší se s jejich výsledky v pořadí. Obyčejné návratové hodnoty i prázdné pole fungují.",
    hints: ["Na každou úlohu počkej přes await uvnitř cyklu, místo abys je spustil všechny naráz."],
    approach: [
      "Úlohy projdi obyčejným cyklem a na každou počkej přes await, než půjdeš dál; právě to je spouští po jedné.",
      "Každou získanou hodnotu průběžně ukládej, aby výsledky odpovídaly pořadí, v jakém úlohy přišly.",
      "Zavolat všechny úlohy předem by je spustilo naráz, takže samotné volání musí proběhnout uvnitř cyklu.",
    ],
    testLabels: ["", "", "obyčejné návratové hodnoty fungují taky", "žádné úlohy", "jediná úloha si nechá svůj falsy výsledek"],
  },
  "js-chunk-an-array": {
    title: "Rozděl pole na části",
    prompt: "Napiš funkci `chunk(items, size)`, která rozdělí pole na skupiny dané velikosti. Poslední skupina může být kratší, velikost větší než pole dá jednu skupinu a prázdné pole dá prázdné pole.",
    hints: ["Pro každou skupinu vyřízni z pole jedno okno pomocí slice."],
    approach: [
      "Nejdřív spočítej, kolik skupin potřebuješ: délka dělená velikostí, zaokrouhlená nahoru.",
      "Pro každou pozici skupiny vezmi slice, který začíná na pozici krát velikost a má size položek.",
      "Slice se na konci pole zastaví sám, takže nerovnoměrné dělení nechá krátkou poslední skupinu a příliš velká velikost dá jednu skupinu.",
    ],
    testLabels: ["", "", "prázdný vstup", "velikost větší než pole", "velikost jedna"],
  },
  "js-group-by-key": {
    title: "Seskup podle klíče",
    prompt: "Napiš funkci `groupBy(items, keyFn)`, která vrátí objekt seskupující položky podle toho, co pro každou vrátí `keyFn`. Ta návratová hodnota se stane klíčem objektu, takže čísla dorazí jako řetězce, a každá hodnota je pole odpovídajících položek, v pořadí.",
    hints: ["Pomocí reduce skládej objekt a každou položku přidej do pole pod jejím klíčem."],
    approach: [
      "Projdi položky a průběžně stavěj výsledný objekt, začni od objektu bez jediného klíče.",
      "Zeptej se funkce klíče, do které přihrádky položka patří, chybějící přihrádku založ jako prázdné pole a pak do ní položku přidej.",
      "Klíče objektu jsou řetězce, takže číslo, které funkce klíče vrátí, se ve výsledku objeví jako text.",
    ],
    testLabels: ["", "", "", "prázdný vstup dá prázdný objekt", "z klíčů jsou řetězce", "všechno v jedné skupině"],
  },
  "js-memoize-results": {
    title: "Memoizace výsledků",
    prompt: "Napiš funkci `memoize(fn)`, která vrátí obalenou funkci cachující podle prvního argumentu, takže `fn` proběhne jednou pro každý různý argument. Falsy výsledek se cachuje taky a každý obal má vlastní cache.",
    hints: ["Obal potřebuje místo, kde si mezi voláními pamatovat dřívější odpovědi. Ptej se, jestli je klíč přítomný, ne jestli je uložená hodnota truthy, jinak cachovaná nula vypadá jako chybějící záznam."],
    approach: [
      "Cache vytvoř jednou, mimo funkci, kterou vracíš, aby ji sdílela všechna další volání; stačí Map s argumentem jako klíčem.",
      "Argument nejdřív vyhledej v cache a kdykoli tam už je, vrať uložený výsledek.",
      "Jen když argument chybí, spusť obalenou funkci a ulož, co vrátila.",
      "Testuj přítomnost, ne pravdivost, jinak se cachovaná nula nebo prázdný řetězec přepočítá pokaždé.",
    ],
    testLabels: ["", "", "", "falsy výsledek se cachuje taky", "každý obal má vlastní cache"],
  },
  "js-event-emitter": {
    title: "Event emitter",
    prompt: "Napiš funkci `createEmitter()`, která vrátí emitter s `on`, `off` a `emit`. `on` a `off` vracejí emitter, takže volání jde řetězit; `off(name, listener)` odebere jen daný listener, zatímco `off(name)` odebere všechny listenery té události; `emit(name, payload)` zavolá každý listener s payloadem a vrátí jejich výsledky jako pole.",
    hints: ["Drž objekt polí s listenery, jedno pole na každý název události."],
    approach: [
      "V closure drž objekt, který každému názvu události přiřazuje pole listenerů k němu zaregistrovaných.",
      "Registrace listener připojí na konec pole pod daným názvem a vrátí emitter; právě to umožňuje registrace řetězit.",
      "Odebrání listener vyfiltruje podle identity, takže volající musí předat přesně tu funkci, kterou dřív zaregistroval.",
      "Emit vyhledá pole pro daný název, zavolá každý listener s payloadem a posbírá, co vrátí; neznámý název dá prázdné pole.",
    ],
    testLabels: ["", "", "", "off odebere jen listener, který dostal", "emit bez listenerů", "listenery slyší jen vlastní událost"],
  },
  "js-lru-cache": {
    title: "LRU cache",
    prompt: "Napiš funkci `LRUCache(strArr)`, která dostane pole písmen v pořadí, v jakém k nim proběhl přístup, a vrátí, co zbylo v cache s kapacitou nejvýš 5, spojené pomlčkami. Přístup k písmenu, které už v cache je, ho přesune na konec jako nejnovější, místo aby ho přidal znovu; když je cache plná, vypadne nejdéle nepoužité písmeno. `LRUCache([\"A\", \"B\", \"A\", \"C\", \"A\", \"B\"])` dá `\"C-A-B\"`.",
    hints: ["Cache drž jako pole s naposledy použitým písmenem na konci. Písmeno, které jsi už viděl, nejdřív odeber z původního místa a pak ho přidej zpátky na konec."],
    approach: [
      "Než cokoli napíšeš, rozhodni, jak je cache seřazená: když je naposledy použité písmeno na konci, vyhození je jen odebrání prvního prvku.",
      "Procházej písmena v pořadí a u každého zjisti, jestli už v cache je.",
      "Písmeno, které jsi už viděl, nepřidávej podruhé: nejdřív ho vyjmi z původní pozice a pak ho dej na konec, aby platilo za nejnovější.",
      "Po přidání odebírej zepředu, dokud je cache přes limit (v tom vyhazování je celé cvičení), a co zbyde, spoj pomlčkami.",
    ],
    testLabels: ["", "", "", "cache se nikdy nezaplní", "pořád stejné písmeno", "žádný přístup", "šesté písmeno vyhodí první"],
  },
};
