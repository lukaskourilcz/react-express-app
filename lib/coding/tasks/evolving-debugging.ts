/** The debugging course: fifteen standalone stages, one console move each.
 *
 * Every stage starts from a small program that runs and is wrong, names the
 * technique that finds the bug fastest, and grades the fix with tests that
 * show what goes into the function and what must come out. Stages do not
 * share code: the registry marks the challenge `standalone`, so each editor
 * opens on its own starter and nothing carries over.
 *
 * The console the stages rely on is `shared/coding-console.ts`, the same
 * object in the browser worker and in the QuickJS grader, and the content
 * contract proves both print the same lines. The last stage is `quiet`: its
 * tests pass only with an empty Console tab, because removing the output is
 * the lesson.
 *
 * Task bodies only. Reference repairs and hidden tests live in
 * `lib/coding/solutions/evolving-debugging.ts`. Both languages are authored
 * here, side by side, because a prompt about a console line rarely survives a
 * word-for-word translation. */

import type { CallTest, CodingTask, Localized } from '../../../shared/coding-catalog';
import type { FailureCategory } from '../../../shared/coding-failure';
import { DEBUGGING_COURSE_ID, DEBUGGING_COURSE_STAGES } from '../../../shared/evolving';
import { text } from './evolving';

const MDN = 'https://developer.mozilla.org/en-US/docs/Web';
const CONSOLE = `${MDN}/API/console`;
const JS = `${MDN}/JavaScript/Reference`;

const ref = (en: string, cs: string, url: string) => ({ title: text(en, cs), url });
const call = (source: string, expected: unknown, label?: [string, string], edge?: true): CallTest => ({
  call: source,
  expected,
  ...(label ? { label: text(label[0], label[1]) } : {}),
  ...(edge ? { edge: true } : {}),
});

interface Stage {
  title: Localized;
  prompt: Localized;
  focus: string[];
  starter: string;
  hints: Localized[];
  pitfall: FailureCategory;
  failureHints?: Partial<Record<FailureCategory, Localized>>;
  tests: CallTest[];
  references: { title: Localized; url: string }[];
  quiet?: true;
}

const STAGES: Stage[] = [
  {
    title: text('Read the error message', 'Přečti si chybovou hlášku'),
    prompt: text(
      '`orderTotal(order)` should add up `price × qty` over `order.items`. Press Run before you change anything, open the Results tab and read the error from start to end: it names what was `undefined` and which property the code read from it. Follow that name back into the code and fix it.',
      '`orderTotal(order)` má sečíst `price × qty` přes `order.items`. Než cokoli změníš, stiskni Spustit, otevři záložku Výsledky a přečti si chybu od začátku do konce: říká, co bylo `undefined` a jakou vlastnost z toho kód četl. Podle toho jména se vrať do kódu a oprav ho.',
    ),
    focus: ['objects', 'map', 'reduce'],
    starter: `// Stage 1 · Read the error message.
// orderTotal(order) adds up price × qty for every line in order.items.
function orderTotal(order) {
  return order.lines
    .map((item) => item.price * item.qty)
    .reduce((sum, value) => sum + value, 0);
}
`,
    hints: [
      text('The message tells you two things: a value was `undefined`, and the code tried to read `map` from it. Which expression sits right before `.map`?', 'Hláška ti říká dvě věci: nějaká hodnota byla `undefined` a kód z ní zkoušel číst `map`. Který výraz stojí těsně před `.map`?'),
      text('Compare the property the code reads with the property the brief and the tests actually pass in.', 'Porovnej vlastnost, kterou kód čte, s vlastností, kterou zadání i testy doopravdy posílají.'),
    ],
    pitfall: 'runtime',
    failureHints: {
      runtime: text('Read the message before the code: it names the property that was read from `undefined`. Find that read.', 'Přečti si hlášku dřív než kód: pojmenovává vlastnost, která se četla z `undefined`. Najdi to čtení.'),
    },
    tests: [
      call('orderTotal({ items: [{ price: 40, qty: 2 }] })', 80),
      call('orderTotal({ items: [{ price: 10, qty: 1 }, { price: 5, qty: 3 }] })', 25),
      call('orderTotal({ items: [] })', 0, ['an empty order totals zero', 'prázdná objednávka má součet nula'], true),
      call('orderTotal({ items: [{ price: 2.5, qty: 4 }] })', 10),
    ],
    references: [
      ref("TypeError: can't access property", 'TypeError: nelze přistoupit k vlastnosti', `${JS}/Errors/Cant_access_property`),
      ref('What went wrong? Troubleshooting JavaScript', 'Co se pokazilo? Hledání chyb v JavaScriptu', `${MDN.replace('/Web', '')}/Learn_web_development/Core/Scripting/What_went_wrong`),
    ],
  },
  {
    title: text('Log what actually comes in', 'Zaloguj, co doopravdy přichází'),
    prompt: text(
      '`addToCart(cart, sku, raw)` takes a quantity straight from a form field and either raises an existing line or adds a new one. It runs without an error and still gives the wrong totals. Put `console.log({ cart, sku, raw })` on the first line, run, and open the Console tab: an object literal shows each argument with its name and, thanks to the JSON quotes, its type. Fix what you find.',
      '`addToCart(cart, sku, raw)` bere množství přímo z formulářového pole a buď navýší existující řádek, nebo přidá nový. Běží bez chyby, a přesto vrací špatné součty. Na první řádek dej `console.log({ cart, sku, raw })`, spusť a otevři záložku Konzole: objektový literál ukáže každý argument i s jménem a díky uvozovkám z JSONu i s typem. Oprav, co najdeš.',
    ),
    focus: ['strings', 'find', 'objects'],
    starter: `// Stage 2 · Log what actually comes in.
// addToCart(cart, sku, raw) adds \`raw\` items of \`sku\` to the cart in place
// and returns the cart. \`raw\` arrives from a form field.
function addToCart(cart, sku, raw) {
  const qty = raw.trim();
  const line = cart.find((item) => item.sku === sku);
  if (line) line.qty = line.qty + qty;
  else cart.push({ sku, qty });
  return cart;
}
`,
    hints: [
      text('Look at how the value prints inside the object: `"1"` with quotes is a string, `1` without them is a number. Which one is `raw`?', 'Podívej se, jak se hodnota v objektu vypíše: `"1"` s uvozovkami je řetězec, `1` bez nich je číslo. Co z toho je `raw`?'),
      text('Turn the trimmed text into a number before you add it; `Number()` does that.', 'Než ho přičteš, převeď ořezaný text na číslo; `Number()` to umí.'),
    ],
    pitfall: 'output-shape',
    failureHints: {
      'output-shape': text('The quantity arrives as text, and `+` joins text. Convert it before the arithmetic.', 'Množství přichází jako text a `+` text spojuje. Převeď ho ještě před počítáním.'),
    },
    tests: [
      call("addToCart([{ sku: 'latte', qty: 2 }], 'latte', ' 1 ')", [{ sku: 'latte', qty: 3 }]),
      call("addToCart([], 'tea', '2')", [{ sku: 'tea', qty: 2 }]),
      call("addToCart([{ sku: 'a', qty: 1 }], 'b', '1')", [{ sku: 'a', qty: 1 }, { sku: 'b', qty: 1 }]),
      call("addToCart([{ sku: 'a', qty: 1 }], 'a', '0')", [{ sku: 'a', qty: 1 }], ['adding zero changes nothing', 'přidání nuly nic nezmění'], true),
    ],
    references: [
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
      ref('Number', 'Number', `${JS}/Global_Objects/Number`),
    ],
  },
  {
    title: text('Log at the boundaries', 'Loguj na hranicích'),
    prompt: text(
      "`priceRange(prices)` should return `{ min, max }` over a list of prices, or `null` for an empty list. Log once on the way in, `console.log('in', prices)`, and once right before the `return`, `console.log('out', min, max)`, then compare the two lines in the Console tab. The value that never made it into `out` tells you where the loop stops short.",
      "`priceRange(prices)` má vrátit `{ min, max }` ze seznamu cen, nebo `null` pro prázdný seznam. Zaloguj jednou při vstupu, `console.log('in', prices)`, a jednou těsně před `return`, `console.log('out', min, max)`, a v záložce Konzole oba řádky porovnej. Hodnota, která se do `out` nikdy nedostala, ti řekne, kde cyklus končí předčasně.",
    ),
    focus: ['for', 'objects'],
    starter: `// Stage 3 · Log at the boundaries.
// priceRange(prices) returns { min, max } of the list, or null when empty.
function priceRange(prices) {
  if (prices.length === 0) return null;
  let min = prices[0];
  let max = prices[0];
  for (let i = 1; i < prices.length - 1; i++) {
    if (prices[i] < min) min = prices[i];
    if (prices[i] > max) max = prices[i];
  }
  return { min, max };
}
`,
    hints: [
      text('`out` never mentions the last price. Count how many times the loop body runs for a three-item list.', '`out` nikdy nezmíní poslední cenu. Spočítej, kolikrát pro tříprvkový seznam proběhne tělo cyklu.'),
      text('The loop condition decides the last index it visits. Write down the index of the last element and compare.', 'Podmínka cyklu rozhoduje o posledním navštíveném indexu. Napiš si index posledního prvku a porovnej.'),
    ],
    pitfall: 'boundary',
    failureHints: {
      boundary: text('The middle of the list is handled and one end is not. Log the last index the loop visits.', 'Střed seznamu se zpracuje, jeden konec ne. Zaloguj poslední index, který cyklus navštíví.'),
    },
    tests: [
      call('priceRange([4, 3, 9])', { min: 3, max: 9 }),
      call('priceRange([2, 8])', { min: 2, max: 8 }),
      call('priceRange([5, 1, 5, 9])', { min: 1, max: 9 }),
      call('priceRange([])', null, ['an empty list has no range', 'prázdný seznam nemá rozsah'], true),
    ],
    references: [
      ref('for statement', 'Příkaz for', `${JS}/Statements/for`),
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
    ],
  },
  {
    title: text('Label every log', 'Každý log pojmenuj'),
    prompt: text(
      "`discountedTotal(items, percent)` should sum the prices and take `percent` off. It comes back negative. Inside `applyDiscount`, log both parameters with labels, `console.log('price', price, 'percent', percent)`, and read the pair in the Console tab. Unlabelled numbers look alike; labelled ones show which value landed in which parameter.",
      "`discountedTotal(items, percent)` má sečíst ceny a odečíst `percent`. Vrací záporné číslo. Uvnitř `applyDiscount` zaloguj oba parametry s popisky, `console.log('price', price, 'percent', percent)`, a v záložce Konzole si dvojici přečti. Čísla bez popisku vypadají stejně; s popiskem je vidět, která hodnota skončila ve kterém parametru.",
    ),
    focus: ['functions', 'reduce'],
    starter: `// Stage 4 · Label every log.
// discountedTotal(items, percent) sums item prices and takes percent off.
function applyDiscount(price, percent) {
  return price - (price * percent) / 100;
}

function discountedTotal(items, percent) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return applyDiscount(percent, total);
}
`,
    hints: [
      text('In the Console tab, `price` shows the small number and `percent` the large one. Which call passes them?', 'V záložce Konzole ukazuje `price` malé číslo a `percent` velké. Které volání je předává?'),
      text('Match the order of the arguments in the call with the order of the parameters in the definition.', 'Srovnej pořadí argumentů ve volání s pořadím parametrů v definici.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('Every result is off in the same direction. Log the two numbers with their names where they are used, and check which one is which.', 'Každý výsledek ujíždí stejným směrem. Zaloguj obě čísla i s názvy tam, kde se používají, a zkontroluj, které je které.'),
    },
    tests: [
      call('discountedTotal([{ price: 200 }], 10)', 180),
      call('discountedTotal([{ price: 50 }, { price: 50 }], 50)', 50),
      call('discountedTotal([{ price: 80 }], 0)', 80, ['no discount leaves the total alone', 'bez slevy zůstane součet stejný']),
      call('discountedTotal([], 20)', 0, ['an empty list totals zero', 'prázdný seznam má součet nula'], true),
    ],
    references: [
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
      ref('Functions', 'Funkce', `${JS}/Functions`),
    ],
  },
  {
    title: text('Lay it out with console.table', 'Rozlož data přes console.table'),
    prompt: text(
      '`inventoryValue(products)` should add up `price × stock` for every product. It returns `NaN`. Start the function with `console.table(products)` and open the Console tab: every column is a field the records really have. Compare those headers with the field names the code reads.',
      '`inventoryValue(products)` má sečíst `price × stock` přes všechny produkty. Vrací `NaN`. Začni funkci řádkem `console.table(products)` a otevři záložku Konzole: každý sloupec je pole, které záznamy doopravdy mají. Porovnej ty hlavičky s názvy polí, které kód čte.',
    ),
    focus: ['for-of', 'objects'],
    starter: `// Stage 5 · Lay it out with console.table.
// inventoryValue(products) adds up price × stock across the products.
function inventoryValue(products) {
  let value = 0;
  for (const product of products) {
    value += product.price * product.stok;
  }
  return value;
}
`,
    hints: [
      text('Read the column headers in the table. Which one does the code spell differently?', 'Přečti si hlavičky sloupců v tabulce. Kterou z nich kód píše jinak?'),
      text('A missing property reads as `undefined`, and `undefined` in arithmetic is `NaN`. Find the read that produces it.', 'Chybějící vlastnost se přečte jako `undefined` a `undefined` v aritmetice dává `NaN`. Najdi čtení, které ho vyrábí.'),
    ],
    pitfall: 'output-shape',
    failureHints: {
      'output-shape': text('`NaN` means something in the multiplication was not a number. One of the property names the code reads does not exist on the records.', '`NaN` znamená, že něco v násobení nebylo číslo. Jeden z názvů vlastností, které kód čte, na záznamech neexistuje.'),
    },
    tests: [
      call("inventoryValue([{ sku: 'latte', price: 40, stock: 5 }])", 200),
      call("inventoryValue([{ sku: 'a', price: 10, stock: 2 }, { sku: 'b', price: 5, stock: 4 }])", 40),
      call('inventoryValue([])', 0, ['nothing in stock is worth nothing', 'nic na skladě nemá žádnou hodnotu'], true),
      call("inventoryValue([{ sku: 'x', price: 9, stock: 0 }])", 0),
    ],
    references: [
      ref('console.table()', 'console.table()', `${CONSOLE}/table_static`),
      ref('Property accessors', 'Přístup k vlastnostem', `${JS}/Operators/Property_accessors`),
    ],
  },
  {
    title: text('Log inside the loop, with the counter', 'Loguj uvnitř cyklu i s počítadlem'),
    prompt: text(
      '`restockPlan(products, minimum)` should return the SKUs whose stock is below `minimum`, in order. Some low products are missing from the result. Log inside the loop with the counter, `console.log(i, products[i].sku, products[i].stock)`, run, and read the Console tab line by line: the iteration that never prints is the one the loop skipped.',
      '`restockPlan(products, minimum)` má vrátit SKU produktů, jejichž zásoba je pod `minimum`, v původním pořadí. Některé produkty s nízkou zásobou ve výsledku chybí. Zaloguj uvnitř cyklu i s počítadlem, `console.log(i, products[i].sku, products[i].stock)`, spusť a v záložce Konzole čti řádek po řádku: iterace, která se nikdy nevypíše, je ta, kterou cyklus přeskočil.',
    ),
    focus: ['for', 'objects', 'push'],
    starter: `// Stage 6 · Log inside the loop, with the counter.
// restockPlan(products, minimum) lists the SKUs with stock below minimum.
function restockPlan(products, minimum) {
  const skus = [];
  for (let i = 1; i < products.length; i++) {
    if (products[i].stock < minimum) skus.push(products[i].sku);
  }
  return skus;
}
`,
    hints: [
      text('The first line in the Console tab starts at 1. What index does the first product have?', 'První řádek v záložce Konzole začíná jedničkou. Jaký index má první produkt?'),
      text('Check where the counter starts.', 'Zkontroluj, kde počítadlo začíná.'),
    ],
    pitfall: 'boundary',
    failureHints: {
      boundary: text('One end of the list is never visited. Print the counter on every pass and compare the first value you see with the first index that exists.', 'Jeden konec seznamu se nikdy nenavštíví. Vypiš počítadlo při každém průchodu a porovnej první hodnotu, kterou uvidíš, s prvním indexem, který existuje.'),
    },
    tests: [
      call("restockPlan([{ sku: 'a', stock: 1 }, { sku: 'b', stock: 9 }], 5)", ['a']),
      call("restockPlan([{ sku: 'a', stock: 9 }, { sku: 'b', stock: 0 }], 5)", ['b']),
      call("restockPlan([{ sku: 'a', stock: 2 }], 3)", ['a'], ['a single low product is listed', 'jediný produkt s nízkou zásobou se vypíše']),
      call('restockPlan([], 3)', [], ['no products, nothing to restock', 'žádné produkty, nic k doplnění'], true),
    ],
    references: [
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
      ref('for statement', 'Příkaz for', `${JS}/Statements/for`),
    ],
  },
  {
    title: text('Log only when it matters', 'Loguj jen, když na tom záleží'),
    prompt: text(
      "`runningBalance(transactions)` should return the balance after each transaction: a `sale` adds `amount`, a `refund` subtracts it. The balances drift negative. Twenty unconditional logs would bury the clue, so log only when the interesting thing happens: `if (balance < 0) console.log('negative after', tx, balance)`. The first line that appears points at the branch that ran for the wrong transaction.",
      "`runningBalance(transactions)` má vrátit zůstatek po každé transakci: `sale` přičte `amount`, `refund` ho odečte. Zůstatky ujíždějí do mínusu. Dvacet bezpodmínečných logů by stopu pohřbilo, tak loguj jen ve chvíli, kdy se stane to zajímavé: `if (balance < 0) console.log('negative after', tx, balance)`. První řádek, který se objeví, ukazuje na větev, která proběhla pro špatnou transakci.",
    ),
    focus: ['for-of', 'objects', 'push'],
    starter: `// Stage 7 · Log only when it matters.
// runningBalance(transactions) returns the balance after each one.
// A 'sale' adds its amount, a 'refund' subtracts it.
function runningBalance(transactions) {
  const balances = [];
  let balance = 0;
  for (const tx of transactions) {
    if (tx.type = 'refund') balance -= tx.amount;
    else balance += tx.amount;
    balances.push(balance);
  }
  return balances;
}
`,
    hints: [
      text('The log fires on the very first sale. Read the condition of that `if` character by character.', 'Log se spustí hned při prvním prodeji. Přečti si podmínku toho `if` znak po znaku.'),
      text('One `=` assigns, and an assignment evaluates to the assigned value, which is truthy here. Compare with `===`.', 'Jedno `=` přiřazuje a přiřazení se vyhodnotí na přiřazenou hodnotu, která je tady pravdivá. Porovnávej přes `===`.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('Every transaction takes the same branch. Read the condition that chooses the branch, one character at a time.', 'Každá transakce jde stejnou větví. Přečti si podmínku, která větev vybírá, znak po znaku.'),
    },
    tests: [
      call("runningBalance([{ type: 'sale', amount: 100 }, { type: 'refund', amount: 30 }])", [100, 70]),
      call("runningBalance([{ type: 'sale', amount: 10 }])", [10]),
      call("runningBalance([{ type: 'refund', amount: 5 }])", [-5], ['a refund before any sale goes below zero', 'vratka před prvním prodejem jde pod nulu']),
      call('runningBalance([])', [], ['no transactions, no balances', 'žádné transakce, žádné zůstatky'], true),
    ],
    references: [
      ref('Strict equality (===)', 'Striktní rovnost (===)', `${JS}/Operators/Strict_equality`),
      ref('Assignment (=)', 'Přiřazení (=)', `${JS}/Operators/Assignment`),
    ],
  },
  {
    title: text('Assert what must hold', 'Ověř, co musí platit'),
    prompt: text(
      "`applyCoupon(total, coupon)` should return the total after a coupon: `{ kind: 'percent', value }` takes a percentage off, `{ kind: 'fixed', value }` takes an amount off, and the result never drops below `0` or rises above `total`. Write that rule down as code, `console.assert(result >= 0 && result <= total, 'out of range', { total, coupon, result })`, just before the `return`. An assertion stays silent while the rule holds and prints the offending values the moment it breaks.",
      "`applyCoupon(total, coupon)` má vrátit částku po slevě: `{ kind: 'percent', value }` odečte procenta, `{ kind: 'fixed', value }` odečte částku a výsledek nikdy neklesne pod `0` ani nepřesáhne `total`. Zapiš to pravidlo jako kód, `console.assert(result >= 0 && result <= total, 'out of range', { total, coupon, result })`, těsně před `return`. Aserce mlčí, dokud pravidlo platí, a vypíše provinilé hodnoty ve chvíli, kdy se poruší.",
    ),
    focus: ['functions', 'objects'],
    starter: `// Stage 8 · Assert what must hold.
// applyCoupon(total, coupon) applies a percent or fixed coupon and keeps the
// result between 0 and total.
function applyCoupon(total, coupon) {
  let result = total;
  if (coupon.kind === 'percent') result = total - total * coupon.value;
  if (coupon.kind === 'fixed') result = Math.max(0, total - coupon.value);
  return result;
}
`,
    hints: [
      text('The assertion prints a `result` far below zero for a percent coupon. A `value` of 10 means ten per cent, not ten times.', 'Aserce vypíše `result` hluboko pod nulou u procentního kupónu. `value` 10 znamená deset procent, ne desetinásobek.'),
      text('Divide the percentage by 100 before you multiply.', 'Než násobíš, vyděl procenta stem.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('One kind of coupon is wildly off and the other is fine. State the range the result must stay in as an assertion and see which branch breaks it.', 'Jeden druh kupónu ujíždí divoce, druhý je v pořádku. Zapiš rozsah, ve kterém má výsledek zůstat, jako aserci a uvidíš, která větev ho porušuje.'),
    },
    tests: [
      call("applyCoupon(200, { kind: 'percent', value: 10 })", 180),
      call("applyCoupon(200, { kind: 'fixed', value: 50 })", 150),
      call("applyCoupon(30, { kind: 'fixed', value: 50 })", 0, ['a coupon larger than the total stops at zero', 'kupón vyšší než součet se zastaví na nule'], true),
      call("applyCoupon(80, { kind: 'percent', value: 25 })", 60),
    ],
    references: [
      ref('console.assert()', 'console.assert()', `${CONSOLE}/assert_static`),
    ],
  },
  {
    title: text('Who called this? console.trace', 'Kdo to zavolal? console.trace'),
    prompt: text(
      "`receipt(order)` builds the lines of a receipt: one per item, a discount line and a total. The discount line shows the wrong amount, and `formatPrice` is called from three places. Put `console.trace('formatPrice', amount)` inside `formatPrice`, run, and read the Console tab: under each `Trace` line stand the functions that led to that call, nearest first. Find the caller that hands over a number that is not a price.",
      "`receipt(order)` skládá řádky účtenky: jeden za každou položku, řádek slevy a součet. Řádek slevy ukazuje špatnou částku a `formatPrice` se volá ze tří míst. Dej do `formatPrice` řádek `console.trace('formatPrice', amount)`, spusť a čti záložku Konzole: pod každým řádkem `Trace` stojí funkce, které k tomu volání vedly, nejbližší první. Najdi volajícího, který předává číslo, jež není cena.",
    ),
    focus: ['functions', 'strings', 'map'],
    starter: `// Stage 9 · Who called this? console.trace.
// receipt(order) returns the receipt lines: one per item, the discount, the total.
function formatPrice(amount) {
  return amount.toFixed(2) + ' CZK';
}

function subtotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function discountAmount(order) {
  return (subtotal(order) * order.discountPercent) / 100;
}

function itemLine(item) {
  return item.name + ' ' + formatPrice(item.price * item.qty);
}

function discountLine(order) {
  return 'discount -' + formatPrice(order.discountPercent);
}

function totalLine(order) {
  return 'total ' + formatPrice(subtotal(order) - discountAmount(order));
}

function receipt(order) {
  return [...order.items.map(itemLine), discountLine(order), totalLine(order)];
}
`,
    hints: [
      text('Three traces per receipt. Under which one does the nearest caller pass the raw percentage?', 'Tři trace na účtenku. Pod kterým z nich předává nejbližší volající syrová procenta?'),
      text('There is already a function that turns the percentage into an amount. The discount line should call it.', 'Funkce, která z procent udělá částku, už existuje. Řádek slevy ji má volat.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('Only one line of the receipt is wrong, and the function that formats it has several callers. Trace which caller passes the value that is not a price.', 'Špatně je jen jeden řádek účtenky a funkce, která ho formátuje, má několik volajících. Vytrasuj, který volající předává hodnotu, jež není cena.'),
    },
    tests: [
      call("receipt({ items: [{ name: 'latte', price: 40, qty: 2 }], discountPercent: 10 })", ['latte 80.00 CZK', 'discount -8.00 CZK', 'total 72.00 CZK']),
      call("receipt({ items: [{ name: 'tea', price: 30, qty: 1 }], discountPercent: 50 })", ['tea 30.00 CZK', 'discount -15.00 CZK', 'total 15.00 CZK']),
      call("receipt({ items: [{ name: 'bun', price: 25, qty: 4 }], discountPercent: 0 })", ['bun 100.00 CZK', 'discount -0.00 CZK', 'total 100.00 CZK'], ['no discount, nothing taken off', 'bez slevy se nic neodečte']),
      call('receipt({ items: [], discountPercent: 20 })', ['discount -0.00 CZK', 'total 0.00 CZK'], ['no items, no discount', 'žádné položky, žádná sleva'], true),
    ],
    references: [
      ref('console.trace()', 'console.trace()', `${CONSOLE}/trace_static`),
    ],
  },
  {
    title: text('Log before and after the mutation', 'Loguj před změnou a po ní'),
    prompt: text(
      "`topSellers(products, n)` should return the `n` best-selling products without touching the list it was given. The results look right, yet the caller's list comes back reordered. Log the SKUs before and after the sort, `console.log('before', products.map((p) => p.sku))` and the same with `'after'`, and compare: an input that changes between the two lines was mutated.",
      "`topSellers(products, n)` má vrátit `n` nejprodávanějších produktů, aniž by sáhla na seznam, který dostala. Výsledky vypadají správně, a přesto se volajícímu vrátí přeházený seznam. Zaloguj SKU před řazením a po něm, `console.log('before', products.map((p) => p.sku))` a totéž s `'after'`, a porovnej: vstup, který se mezi oběma řádky změnil, byl zmutovaný.",
    ),
    focus: ['sort', 'spread', 'slice'],
    starter: `// Stage 10 · Log before and after the mutation.
// topSellers(products, n) returns the n products with the most sales,
// highest first, and leaves the given list as it was.
function topSellers(products, n) {
  const ranked = products.sort((a, b) => b.sold - a.sold);
  return ranked.slice(0, n);
}
`,
    hints: [
      text('`after` is not in the same order as `before`, and you never assigned to `products`. Which method reorders the array it is called on?', '`after` není ve stejném pořadí jako `before`, a do `products` jsi nic nepřiřadil. Která metoda přeskládá pole, na kterém se volá?'),
      text('Sort a copy: spread the array into a new one first.', 'Řaď kopii: nejdřív pole rozbal do nového.'),
    ],
    pitfall: 'mutation',
    tests: [
      call("topSellers([{ sku: 'a', sold: 1 }, { sku: 'b', sold: 5 }], 1)", [{ sku: 'b', sold: 5 }]),
      call("(() => { const list = [{ sku: 'a', sold: 1 }, { sku: 'b', sold: 5 }]; topSellers(list, 1); return list.map((p) => p.sku); })()", ['a', 'b'], ["the caller's list keeps its order", 'seznam volajícího si drží pořadí']),
      call("(() => { const list = [{ sku: 'x', sold: 2 }, { sku: 'y', sold: 9 }, { sku: 'z', sold: 4 }]; topSellers(list, 2); return list[0].sku; })()", 'x', ['the first product stays first', 'první produkt zůstane první']),
      call('topSellers([], 3)', [], ['no products, no sellers', 'žádné produkty, žádní prodejci'], true),
    ],
    references: [
      ref('Array.prototype.sort()', 'Array.prototype.sort()', `${JS}/Global_Objects/Array/sort`),
      ref('Spread syntax (...)', 'Rozbalovací syntaxe (...)', `${JS}/Operators/Spread_syntax`),
    ],
  },
  {
    title: text('Snapshot nested state with JSON.stringify', 'Snímek vnořeného stavu přes JSON.stringify'),
    prompt: text(
      '`markPaid(order)` should return a copy of the order with `status.paid` set to `true` and leave the original untouched. Tests that only look at the copy pass; the original changes too. Log the original as a snapshot before and after the call, `console.log(JSON.stringify(order))`: a string is frozen at the moment you print it, whereas a logged object in a browser console is a live reference that shows later changes. Compare the two snapshots and find the part that was shared instead of copied.',
      '`markPaid(order)` má vrátit kopii objednávky se `status.paid` nastaveným na `true` a originál nechat beze změny. Testy, které se dívají jen na kopii, procházejí; originál se ale mění taky. Zaloguj originál jako snímek před voláním a po něm, `console.log(JSON.stringify(order))`: řetězec je zmražený ve chvíli tisku, zatímco zalogovaný objekt je v konzoli prohlížeče živý odkaz, který ukazuje i pozdější změny. Oba snímky porovnej a najdi část, která se sdílela místo kopírování.',
    ),
    focus: ['spread', 'json', 'objects'],
    starter: `// Stage 11 · Snapshot nested state with JSON.stringify.
// markPaid(order) returns a copy with status.paid = true; the original stays as it was.
function markPaid(order) {
  const copy = { ...order };
  copy.status.paid = true;
  return copy;
}
`,
    hints: [
      text('The snapshot after the call shows `paid: true` on the original. The spread copied the top level; what did it do with `status`?', 'Snímek po volání ukazuje `paid: true` i na originálu. Rozbalení zkopírovalo nejvyšší úroveň; co udělalo se `status`?'),
      text('Copy the nested object too, or clone the whole thing with `structuredClone` before you change it.', 'Zkopíruj i vnořený objekt, nebo celek před změnou naklonuj přes `structuredClone`.'),
    ],
    pitfall: 'mutation',
    tests: [
      call('markPaid({ id: 1, status: { paid: false } })', { id: 1, status: { paid: true } }),
      call('(() => { const order = { id: 1, status: { paid: false } }; markPaid(order); return order.status.paid; })()', false, ['the original order is still unpaid', 'původní objednávka je pořád nezaplacená']),
      call('(() => { const order = { id: 2, status: { paid: false, shipped: false } }; const paid = markPaid(order); return [paid.status.shipped, order.status.paid]; })()', [false, false]),
      call('markPaid({ id: 3, status: { paid: true } })', { id: 3, status: { paid: true } }, ['an order that is already paid stays paid', 'už zaplacená objednávka zůstane zaplacená'], true),
    ],
    references: [
      ref('JSON.stringify()', 'JSON.stringify()', `${JS}/Global_Objects/JSON/stringify`),
      ref('structuredClone()', 'structuredClone()', `${MDN}/API/Window/structuredClone`),
    ],
  },
  {
    title: text('Bisect the pipeline', 'Půl hledání: bisekce pipeline'),
    prompt: text(
      "`summarize(lines)` turns raw `'sku,price,qty'` lines into `{ sku, total }` records in four steps: parse, keep, group, sort. Some lines vanish. Do not read all four steps; halve the search instead. Log the data after step two, `console.log('after keep', kept)`. If the lost line is already gone, the fault is in the first half; if it is still there, in the second. Repeat once more and you are standing on the broken step.",
      "`summarize(lines)` převádí syrové řádky `'sku,price,qty'` na záznamy `{ sku, total }` ve čtyřech krocích: parse, keep, group, sort. Některé řádky se ztrácejí. Nečti všechny čtyři kroky; místo toho hledání rozpůl. Zaloguj data po druhém kroku, `console.log('after keep', kept)`. Pokud ztracený řádek už chybí, chyba je v první polovině; pokud tam ještě je, ve druhé. Zopakuj to ještě jednou a stojíš na rozbitém kroku.",
    ),
    focus: ['split', 'map', 'filter', 'objects'],
    starter: `// Stage 12 · Bisect the pipeline.
// summarize(lines) turns 'sku,price,qty' lines into { sku, total } records,
// one per sku, sorted by sku. Lines with qty 0 are dropped.
function parse(lines) {
  return lines.map((line) => {
    const [sku, price, qty] = line.split(',');
    return { sku, price: Number(price), qty: Number(qty) };
  });
}

function keep(items) {
  return items.filter((item) => item.qty > 1);
}

function group(items) {
  const totals = {};
  for (const item of items) totals[item.sku] = (totals[item.sku] ?? 0) + item.price * item.qty;
  return Object.entries(totals).map(([sku, total]) => ({ sku, total }));
}

function sortBySku(records) {
  return [...records].sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));
}

function summarize(lines) {
  const parsed = parse(lines);
  const kept = keep(parsed);
  const grouped = group(kept);
  return sortBySku(grouped);
}
`,
    hints: [
      text('`after keep` is already missing the line with quantity 1, so the fault is in `parse` or `keep`. Log after `parse` to split those two.', '`after keep` už postrádá řádek s množstvím 1, takže chyba je v `parse` nebo `keep`. Zaloguj po `parse` a rozděl ty dva.'),
      text('The brief drops quantity 0. Read the comparison in `keep` against that.', 'Zadání zahazuje množství 0. Přečti si porovnání v `keep` s tímhle na mysli.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('Some inputs vanish somewhere along the pipeline. Log the data at the midpoint and decide which half lost them, then halve again.', 'Některé vstupy se někde v pipeline ztrácejí. Zaloguj data uprostřed, rozhodni, která polovina je ztratila, a rozpůl znovu.'),
    },
    tests: [
      call("summarize(['latte,40,2', 'tea,30,1'])", [{ sku: 'latte', total: 80 }, { sku: 'tea', total: 30 }]),
      call("summarize(['bun,25,1', 'bun,25,1'])", [{ sku: 'bun', total: 50 }], ['two lines of one sku add up', 'dva řádky jednoho sku se sečtou']),
      call("summarize(['tea,30,0', 'tea,30,3'])", [{ sku: 'tea', total: 90 }], ['a zero-quantity line is dropped', 'řádek s nulovým množstvím se zahodí']),
      call('summarize([])', [], ['no lines, no records', 'žádné řádky, žádné záznamy'], true),
    ],
    references: [
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
      ref('Array.prototype.filter()', 'Array.prototype.filter()', `${JS}/Global_Objects/Array/filter`),
    ],
  },
  {
    title: text('Shrink the failing input', 'Zmenši selhávající vstup'),
    prompt: text(
      '`mergeRanges(ranges)` should merge overlapping or touching `[start, end]` pairs and return them sorted by start. The five-range test fails and its output is hard to read. Instead of staring at it, shrink it: copy the failing input into the scratch call, remove one range, run, and keep removing while it still fails. Two ranges that reproduce the bug are easier to reason about than five. Log each attempt so you can see what you tried.',
      '`mergeRanges(ranges)` má sloučit překrývající se nebo dotýkající se dvojice `[start, end]` a vrátit je seřazené podle začátku. Test s pěti rozsahy selhává a jeho výstup se špatně čte. Místo zírání ho zmenši: zkopíruj selhávající vstup do zkušebního volání, odeber jeden rozsah, spusť a odebírej dál, dokud pořád selhává. O dvou rozsazích, které chybu reprodukují, se uvažuje snáz než o pěti. Každý pokus zaloguj, ať vidíš, co jsi zkoušel.',
    ),
    focus: ['sort', 'for-of', 'spread'],
    starter: `// Stage 13 · Shrink the failing input.
// mergeRanges(ranges) merges overlapping or touching [start, end] pairs,
// sorted by start.
function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start < last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

// Scratch pad: shrink the failing input here and press Run.
console.log(mergeRanges([[9, 12], [1, 3], [3, 5], [6, 8], [8, 8]]));
`,
    hints: [
      text('Keep shrinking until two ranges remain and it still fails. Look at where the first ends and the second starts.', 'Zmenšuj, dokud nezbydou dva rozsahy a pořád to selhává. Podívej se, kde první končí a druhý začíná.'),
      text('A range that starts exactly where the last one ends still touches it. Check the comparison.', 'Rozsah, který začíná přesně tam, kde předchozí končí, se ho pořád dotýká. Zkontroluj porovnání.'),
    ],
    pitfall: 'boundary',
    tests: [
      call('mergeRanges([[9, 12], [1, 3], [3, 5], [6, 8], [8, 8]])', [[1, 5], [6, 8], [9, 12]], ['touching ranges merge', 'dotýkající se rozsahy se sloučí']),
      call('mergeRanges([[1, 3], [3, 5]])', [[1, 5]]),
      call('mergeRanges([[1, 4], [2, 6], [8, 10]])', [[1, 6], [8, 10]]),
      call('mergeRanges([])', [], ['no ranges, nothing to merge', 'žádné rozsahy, nic ke sloučení'], true),
    ],
    references: [
      ref('Less than or equal (<=)', 'Menší nebo rovno (<=)', `${JS}/Operators/Less_than_or_equal`),
      ref('console.log()', 'console.log()', `${CONSOLE}/log_static`),
    ],
  },
  {
    title: text('Check the type before you trust it', 'Než hodnotě uvěříš, ověř její typ'),
    prompt: text(
      '`parseOrder(input)` should accept either a JSON string or an already-parsed value and return the parsed value, or `null` when the text is not valid JSON. Objects passed straight in come back as `null`. Before anything else, log what the function believes it received: `console.log(typeof input, Array.isArray(input))`. Branch on what you see.',
      '`parseOrder(input)` má přijmout buď JSON řetězec, nebo už naparsovanou hodnotu a vrátit naparsovanou hodnotu, případně `null`, když text není platný JSON. Objekty předané rovnou se vracejí jako `null`. Než uděláš cokoli jiného, zaloguj, co si funkce myslí, že dostala: `console.log(typeof input, Array.isArray(input))`. Podle toho, co uvidíš, se rozvětvi.',
    ),
    focus: ['json', 'objects', 'functions'],
    starter: `// Stage 14 · Check the type before you trust it.
// parseOrder(input) returns the parsed order from a JSON string or an
// already-parsed value, or null when the text is not valid JSON.
function parseOrder(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
`,
    hints: [
      text('The log says `object false` for the failing call. `JSON.parse` wants a string; what does it do with an object?', 'Log u selhávajícího volání říká `object false`. `JSON.parse` chce řetězec; co udělá s objektem?'),
      text('Return non-strings as they are and parse only text.', 'Co není řetězec, vrať beze změny, a parsuj jen text.'),
    ],
    pitfall: 'tests',
    failureHints: {
      tests: text('The function treats every input the same way. Log `typeof input` first and give each kind its own path.', 'Funkce zachází s každým vstupem stejně. Nejdřív zaloguj `typeof input` a dej každému druhu vlastní cestu.'),
    },
    tests: [
      call("parseOrder('{\"id\":1}')", { id: 1 }),
      call('parseOrder({ id: 2 })', { id: 2 }, ['an object passes through untouched', 'objekt projde beze změny']),
      call('parseOrder([3])', [3]),
      call("parseOrder('not json')", null, ['invalid text is null', 'neplatný text je null'], true),
    ],
    references: [
      ref('typeof', 'typeof', `${JS}/Operators/typeof`),
      ref('JSON.parse()', 'JSON.parse()', `${JS}/Global_Objects/JSON/parse`),
    ],
  },
  {
    title: text('Clean up before you ship', 'Ukliď, než odevzdáš'),
    prompt: text(
      '`checkout(cart, coupon)` is finished apart from what debugging left behind: logs, a table, a group and a temporary shortcut that returns a fixed number for one-item carts. Remove every console call and every leftover shortcut, keep every test green, and submit with an empty Console tab. This stage checks the console too: output that is still there fails it.',
      '`checkout(cart, coupon)` je hotová až na to, co po ladění zůstalo: logy, tabulka, skupina a dočasná zkratka, která pro jednopoložkový košík vrací pevné číslo. Odstraň každé volání console i každou zapomenutou zkratku, udrž všechny testy zelené a odevzdej s prázdnou záložkou Konzole. Tahle etapa kontroluje i konzoli: výstup, který tam zůstal, ji shodí.',
    ),
    focus: ['for-of', 'functions'],
    starter: `// Stage 15 · Clean up before you ship.
// checkout(cart, coupon) returns the total after an optional coupon:
// { kind: 'percent', value } or { kind: 'fixed', value }, never below 0.
function checkout(cart, coupon) {
  console.group('checkout');
  console.table(cart);
  if (cart.length === 1) return 99; // TEMP: checking the one-item path
  let total = 0;
  for (const item of cart) {
    console.log('item', item.price, item.qty);
    total += item.price * item.qty;
  }
  console.log('total before coupon', total);
  if (coupon && coupon.kind === 'percent') total -= (total * coupon.value) / 100;
  if (coupon && coupon.kind === 'fixed') total -= coupon.value;
  console.groupEnd();
  return Math.max(0, total);
}
`,
    hints: [
      text('The tests pass and the Console tab is still full. Search the function for `console.` and delete each call, or put them behind `if (DEBUG)` with `DEBUG` set to `false`.', 'Testy procházejí a záložka Konzole je pořád plná. Prohledej funkci na `console.` a každé volání smaž, nebo je schovej za `if (DEBUG)` s `DEBUG` nastaveným na `false`.'),
      text('One line is not a log at all: a `return` that was added to test one path. It has to go too.', 'Jeden řádek vůbec není log: `return` přidaný kvůli otestování jedné cesty. Musí pryč taky.'),
    ],
    pitfall: 'tests',
    quiet: true,
    tests: [
      call('checkout([{ price: 40, qty: 1 }], null)', 40, ['a one-item cart totals its item', 'košík s jednou položkou má její cenu']),
      call('checkout([{ price: 10, qty: 2 }, { price: 5, qty: 1 }], null)', 25),
      call("checkout([{ price: 100, qty: 1 }], { kind: 'percent', value: 10 })", 90),
      call('checkout([], null)', 0, ['an empty cart totals zero', 'prázdný košík má součet nula'], true),
    ],
    references: [
      ref('console', 'console', CONSOLE),
    ],
  },
];

/** The fifteen stages as ordinary tasks, one per registry stage id. */
export function buildDebuggingCourse(): CodingTask[] {
  if (STAGES.length !== DEBUGGING_COURSE_STAGES) throw new Error(`the debugging course authors ${STAGES.length} stages, the registry lists ${DEBUGGING_COURSE_STAGES}`);
  return STAGES.map((stage, index): CodingTask => ({
    id: `${DEBUGGING_COURSE_ID}-${index + 1}`,
    track: 'javascript',
    topic: 'javascript',
    level: 25,
    tier: 2,
    format: 'debug',
    focus: stage.focus,
    title: stage.title,
    prompt: stage.prompt,
    starter: stage.starter,
    hints: { en: stage.hints.map((hint) => hint.en), cs: stage.hints.map((hint) => hint.cs) },
    verify: 'tests',
    pitfall: stage.pitfall,
    ...(stage.failureHints ? { failureHints: stage.failureHints } : {}),
    ...(stage.quiet ? { quiet: true } : {}),
    tests: stage.tests,
    references: stage.references,
    estimatedMinutes: 6,
  }));
}
