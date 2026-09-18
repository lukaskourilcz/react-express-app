/** The debugging path: one evolving challenge about the skill every other
 * challenge takes for granted — finding out what code actually does before
 * changing it.
 *
 * Every stage starts from the same small program, which is already written
 * and partly wrong. The stages follow the rhythm Cathy Lai describes in "How
 * I finally learnt to solve coding interview questions": verify the setup and
 * write the assumptions down; trace an example by hand and say the roadblock
 * out loud; validate the logic at its edges; only then write code, in pieces,
 * with a log between the pieces; and treat the bug you did not plant as
 * ordinary work. `console.log` is the instrument throughout — the Console tab
 * shows what each part of the program is doing — and every stage asks for one
 * more thing to be seen before it is fixed.
 *
 * Task bodies only: prompts, the shared starter, visible tests, hints and the
 * method steps. Solutions live in `lib/coding/solutions/evolving-debug.ts`. */

import type { CallTest, Localized } from '../../../shared/coding-catalog';
import { text, type Spec } from './evolving';

export const DEBUG_CHALLENGE_ID = 'js-evolving-debug';

const check = (call: string, expected: unknown, label?: [string, string], edge = false): CallTest => ({
  call,
  expected,
  ...(label ? { label: text(label[0], label[1]) } : {}),
  ...(edge ? { edge: true } : {}),
});

/** The program every stage begins from. It runs, and four of its parts are
 * wrong in the ways real code is wrong: a type nobody checked, a variable
 * doing two jobs, an edge nobody tested, and a helper that forgets to give
 * its value back. The fifth stage adds the input nobody planned for. */
const STARTER = `// A café's day, one order per line: "item,quantity,unitPrice".
// Every function below is already written. Some are wrong. This path is
// about finding out which, and how, before changing anything: press Run,
// read the Console, and log one piece at a time.

function parseOrder(line) {
  const parts = line.split(",");
  return { item: parts[0], quantity: parts[1], unitPrice: parts[2] };
}

function orderTotal(order) {
  return order.quantity * order.unitPrice;
}

function summarize(lines) {
  const totals = {};
  let running = 0;
  for (const line of lines) {
    const order = parseOrder(line);
    running += orderTotal(order);
    totals[order.item] = running;
  }
  return totals;
}

function applyDiscount(total, threshold, percent) {
  if (total > threshold) {
    return total - total * percent;
  }
  return total;
}

function trace(label, value) {
  console.log(label, value);
}

function report(lines, threshold, percent) {
  // Summarize, then discount each item's total.
  return [];
}

// Scratch pad — change this and press Run.
console.log(parseOrder("latte,3,4.50"));
`;

const mdn = 'https://developer.mozilla.org/en-US/docs/Web/';
const ref = (en: string, cs: string, url: string) => ({ title: text(en, cs), url });

export const DEBUG_EVOLVING: Record<string, Spec> = {
  [DEBUG_CHALLENGE_ID]: {
    starter: STARTER,
    focus: ['functions', 'objects', 'strings'],
    format: 'debug',
    pitfalls: ['output-shape', 'output-shape', 'boundary', 'missing-return', 'runtime'],
    prompts: [
      text(
        'Verify the setup, then write down what you assume. Press Run before you touch anything: the scratch pad already logs one parsed order, so read the Console and say what type `quantity` is. Then make `parseOrder(line)` return `{item, quantity, unitPrice}` with every field trimmed and the two numbers as numbers — `"latte,3,4.50"` gives `{item: "latte", quantity: 3, unitPrice: 4.5}`. Log `parts` after the split before you fix it, and log the result after.',
        'Ověř si prostředí a pak si zapiš, co předpokládáš. Než na cokoli sáhneš, stiskni Spustit: zápisník už loguje jednu naparsovanou objednávku, tak si přečti Konzoli a řekni, jakého typu je `quantity`. Potom uprav `parseOrder(line)` tak, aby vracela `{item, quantity, unitPrice}` s oříznutými poli a oběma čísly jako čísly — `"latte,3,4.50"` dá `{item: "latte", quantity: 3, unitPrice: 4.5}`. Než to opravíš, zaloguj `parts` hned po rozdělení, a po opravě zaloguj výsledek.',
      ),
      text(
        'Trace it by hand before you trust it. `summarize(lines)` should map each item to the sum of its order totals: `["latte,1,4", "tea,2,1", "latte,1,4"]` gives `{latte: 8, tea: 2}`. On paper, walk that input through the loop and write down `order`, `running` and `totals` after every line. Then log the same three values inside the loop and compare. Ask the question out loud: is `running` tracked per item, or across all items? `orderTotal` is fine — prove it to yourself with one log before you move on.',
        'Než kódu uvěříš, projdi ho ručně. `summarize(lines)` má každé položce přiřadit součet jejích objednávek: `["latte,1,4", "tea,2,1", "latte,1,4"]` dá `{latte: 8, tea: 2}`. Na papíře proveď tenhle vstup cyklem a po každém řádku si zapiš `order`, `running` a `totals`. Pak tytéž tři hodnoty zaloguj uvnitř cyklu a porovnej. Polož si tu otázku nahlas: sleduje se `running` pro každou položku zvlášť, nebo napříč všemi? `orderTotal` je v pořádku — ověř si to jedním logem, než půjdeš dál.',
      ),
      text(
        'Validate the logic at its edges. `applyDiscount(total, threshold, percent)` should take `percent` off (a whole number: `10` means ten percent) when `total` is at or above `threshold`, rounded to two decimals, and return `total` unchanged below it: `applyDiscount(50, 50, 10)` is `45`, `applyDiscount(49.99, 50, 10)` is `49.99`. Two things are wrong. Log the inputs and the result for a total exactly at the threshold, then for one a cent below it, then log `total * percent` on its own.',
        'Ověř logiku na okrajích. `applyDiscount(total, threshold, percent)` má odečíst `percent` (celé číslo: `10` znamená deset procent), když je `total` na prahu `threshold` nebo nad ním, zaokrouhlit na dvě desetinná místa, a pod prahem vrátit `total` beze změny: `applyDiscount(50, 50, 10)` je `45`, `applyDiscount(49.99, 50, 10)` je `49.99`. Špatně jsou dvě věci. Zaloguj vstupy a výsledek pro částku přesně na prahu, pak pro částku o cent nižší, a nakonec zaloguj samotné `total * percent`.',
      ),
      text(
        'Now write code — in pieces, with a log between them. First, `trace(label, value)` is meant to be a pass-through: log the label and the value, then return the value unchanged, so it can sit inside any expression. Right now it swallows the value. Then write `report(lines, threshold, percent)`: summarize the lines and, for each item sorted by name, return `{item, total, discounted}` where `discounted` is `applyDiscount(total, threshold, percent)`. Get the totals right and logged before you write the rows.',
        'Teď piš kód — po kouscích, s logem mezi nimi. Nejdřív `trace(label, value)`: má být průchozí, tedy zalogovat popisek i hodnotu a hodnotu beze změny vrátit, aby šla vložit do libovolného výrazu. Teď ji polyká. Potom napiš `report(lines, threshold, percent)`: sečti řádky přes summarize a pro každou položku seřazenou podle názvu vrať `{item, total, discounted}`, kde `discounted` je `applyDiscount(total, threshold, percent)`. Než napíšeš řádky výstupu, měj součty správně a zalogované.',
      ),
      text(
        'Stay calm with the bug you did not plant. Real data has bad lines. Add `safeReport(lines, threshold, percent)` that checks each line in this order — trimmed empty is `"empty"`, not exactly three comma-separated fields is `"fields"`, a blank or non-finite quantity or unitPrice is `"number"` — collects `{line, reason}` in input order, runs `report` on the good lines only, and returns `{rows, problems}`. When your first attempt throws, that is not an emergency: read the message, log the line that caused it, and handle that one case.',
        'Zachovej klid u chyby, kterou jsi nenastražil ty. Skutečná data mají špatné řádky. Přidej `safeReport(lines, threshold, percent)`, která každý řádek zkontroluje v tomto pořadí — po oříznutí prázdný je `"empty"`, jiný počet než přesně tři pole oddělená čárkou je `"fields"`, prázdné nebo nekonečné množství či cena je `"number"` — sbírá `{line, reason}` v pořadí vstupu, `report` spustí jen na dobrých řádcích a vrátí `{rows, problems}`. Když první pokus vyhodí chybu, není to pohotovost: přečti si zprávu, zaloguj řádek, který ji způsobil, a ošetři právě ten případ.',
      ),
    ],
    hints: [
      text('Before you fix anything, log `parts` right after the split and read the Console. The quotes around the numbers are the bug.', 'Než cokoli opravíš, zaloguj `parts` hned po rozdělení a přečti si Konzoli. Ta chyba jsou uvozovky kolem čísel.'),
      text('One variable is doing two jobs. Ask out loud: is `running` tracked per item, or across all items?', 'Jedna proměnná dělá dvě práce. Zeptej se nahlas: sleduje se `running` pro každou položku, nebo napříč všemi?'),
      text('Log the inputs and the result for a total exactly at the threshold, then for one a cent below it. Then log `total * percent` alone.', 'Zaloguj vstupy a výsledek pro částku přesně na prahu, pak pro částku o cent nižší. Potom zaloguj samotné `total * percent`.'),
      text('A pass-through helper logs and then returns. Once trace hands the value back, build report one piece at a time with a trace() between the pieces.', 'Průchozí pomocník zaloguje a pak vrátí. Jakmile trace hodnotu vrací, stav report po kouscích a mezi kousky dej trace().'),
      text('When a bad line throws, read the error, log the line that caused it, and add one check for that case. Check for empty first, then the field count, then the numbers.', 'Když špatný řádek vyhodí chybu, přečti si ji, zaloguj řádek, který ji způsobil, a přidej jednu kontrolu pro ten případ. Nejdřív prázdný řádek, pak počet polí, pak čísla.'),
    ],
    approaches: [
      [
        text('Run it as it is. The scratch pad already logs one order; read the Console before you read the code.', 'Spusť to tak, jak to je. Zápisník už loguje jednu objednávku; přečti si Konzoli dřív než kód.'),
        text('Log `parts` after the split. Every field is text, and two of them are meant to be numbers.', 'Zaloguj `parts` po rozdělení. Každé pole je text, a dvě z nich mají být čísla.'),
        text('Trim each field, then convert the two numbers with Number(). Log the result once more to confirm.', 'Každé pole ořízni a obě čísla převeď přes Number(). Pro jistotu výsledek ještě jednou zaloguj.'),
      ],
      [
        text('Trace ["latte,1,4", "tea,2,1", "latte,1,4"] on paper: after each line, write down order, running and totals.', 'Projdi ["latte,1,4", "tea,2,1", "latte,1,4"] na papíře: po každém řádku si zapiš order, running a totals.'),
        text('Log the same three values inside the loop and compare with your trace. Where they differ is where the bug is.', 'Tytéž tři hodnoty zaloguj uvnitř cyklu a porovnej se svým zápisem. Kde se liší, tam je chyba.'),
        text('Keep one total per item: read what the item has so far (or 0), add this order, write it back.', 'Drž jeden součet na položku: přečti, co položka zatím má (nebo 0), přičti tuhle objednávku a zapiš zpět.'),
      ],
      [
        text('Test the boundary first: what should a total exactly at the threshold get? Log what it gets.', 'Nejdřív otestuj hranici: co má dostat částka přesně na prahu? Zaloguj, co dostane.'),
        text('10 means ten percent, so the fraction is percent / 100. Log the discount amount alone and check it against arithmetic you did in your head.', '10 znamená deset procent, takže zlomek je percent / 100. Zaloguj samotnou slevu a porovnej ji s tím, co spočítáš z hlavy.'),
        text('Round the discounted total with Math.round(x * 100) / 100, and leave totals below the threshold untouched.', 'Sníženou částku zaokrouhli přes Math.round(x * 100) / 100 a částky pod prahem nech být.'),
      ],
      [
        text('Fix trace first: log the label and the value, then return the value. Prove it with trace("x", 5) in the scratch pad.', 'Nejdřív oprav trace: zaloguj popisek a hodnotu, pak hodnotu vrať. Ověř to v zápisníku přes trace("x", 5).'),
        text('In report, get the totals from summarize and log them. Do not write the next step until that log looks right.', 'V report si vezmi součty ze summarize a zaloguj je. Další krok nepiš, dokud ten log nevypadá správně.'),
        text('Turn the totals into rows: sort the item names, then map each to {item, total, discounted} using applyDiscount.', 'Ze součtů udělej řádky: seřaď názvy položek a každý převeď na {item, total, discounted} pomocí applyDiscount.'),
      ],
      [
        text('Run report on the messy example and let it throw. The error message tells you which line to look at; log that line.', 'Spusť report na rozbitém příkladu a nech ho spadnout. Chybová zpráva ti řekne, na který řádek se podívat; zaloguj ho.'),
        text('Validate each line in order: trimmed empty is "empty"; not exactly three comma-separated fields is "fields"; a blank or non-finite quantity or unitPrice is "number".', 'Každý řádek ověř v pořadí: po oříznutí prázdný je "empty"; jiný počet než tři pole oddělená čárkou je "fields"; prázdné nebo nekonečné množství či cena je "number".'),
        text('Collect the problems in input order, hand only the good lines to report, and return {rows, problems}.', 'Problémy sbírej v pořadí vstupu, do report pošli jen dobré řádky a vrať {rows, problems}.'),
      ],
    ],
    tests: [
      [
        check('parseOrder("latte,3,4.50")', { item: 'latte', quantity: 3, unitPrice: 4.5 }),
        check('typeof parseOrder("tea,2,1").quantity', 'number', ['quantity is a number, not the text "2"', 'quantity je číslo, ne text "2"']),
        check('parseOrder(" tea , 2 , 1.25 ")', { item: 'tea', quantity: 2, unitPrice: 1.25 }, ['spaces around every field are trimmed', 'mezery kolem každého pole jsou oříznuté']),
        check('parseOrder("flat white,1,3")', { item: 'flat white', quantity: 1, unitPrice: 3 }, ['a space inside the name stays', 'mezera uvnitř názvu zůstává']),
        check('parseOrder("cake,0,2.5").quantity', 0, ['zero is a quantity', 'nula je množství'], true),
      ],
      [
        check('summarize(["latte,1,4","tea,2,1","latte,1,4"])', { latte: 8, tea: 2 }, ['each item keeps its own total', 'každá položka má vlastní součet']),
        check('summarize(["a,1,1","b,1,1","a,1,1","b,1,1"])', { a: 2, b: 2 }),
        check('summarize(["tea,2,1.5"])', { tea: 3 }),
        check('summarize(["cake,0,2.5","cake,1,2.5"])', { cake: 2.5 }),
        check('summarize([])', {}, ['no lines, no totals', 'žádné řádky, žádné součty'], true),
      ],
      [
        check('applyDiscount(50, 50, 10)', 45, ['exactly at the threshold counts', 'přesně na prahu se počítá'], true),
        check('applyDiscount(49.99, 50, 10)', 49.99, ['a cent below it does not', 'o cent níž už ne'], true),
        check('applyDiscount(100, 50, 10)', 90),
        check('applyDiscount(33.33, 10, 10)', 30, ['rounded to two decimals', 'zaokrouhleno na dvě desetinná místa']),
        check('applyDiscount(10, 10, 0)', 10),
      ],
      [
        check('trace("order", {item: "tea"})', { item: 'tea' }, ['trace hands the value back', 'trace hodnotu vrátí']),
        check('report(["latte,2,4","tea,1,1"], 5, 10)', [{ item: 'latte', total: 8, discounted: 7.2 }, { item: 'tea', total: 1, discounted: 1 }]),
        check('report(["b,1,1","a,1,1"], 100, 50).map(row => row.item)', ['a', 'b'], ['rows are sorted by item', 'řádky jsou seřazené podle položky']),
        check('report(["latte,1,4","latte,1,4"], 8, 25)', [{ item: 'latte', total: 8, discounted: 6 }]),
        check('report([], 1, 1)', [], ['no lines, no rows', 'žádné řádky, žádné výsledky'], true),
      ],
      [
        check('safeReport(["latte,1,4","","tea,x,1","cake,1"], 100, 10)', { rows: [{ item: 'latte', total: 4, discounted: 4 }], problems: [{ line: '', reason: 'empty' }, { line: 'tea,x,1', reason: 'number' }, { line: 'cake,1', reason: 'fields' }] }, ['bad lines are reported, good lines are still counted', 'špatné řádky se nahlásí, dobré se dál počítají']),
        check('safeReport(["   "], 1, 1).problems', [{ line: '   ', reason: 'empty' }], ['whitespace only is empty', 'jen mezery znamená prázdný']),
        check('safeReport(["a,1,1,1"], 1, 1).problems[0].reason', 'fields'),
        check('safeReport(["a,1,Infinity"], 1, 1).problems[0].reason', 'number', ['Infinity is not a price', 'Infinity není cena'], true),
        check('safeReport(["a,two,1","b,1,1"], 100, 10).rows', [{ item: 'b', total: 1, discounted: 1 }]),
      ],
    ],
    references: [
      [
        ref('How I finally learnt to solve coding interview questions (Cathy Lai)', 'Jak jsem se konečně naučila řešit programovací úlohy (Cathy Lai)', 'https://dev.to/cathylai/how-i-finally-learnt-to-solve-coding-interview-questions-2cop'),
        ref('console.log()', 'console.log()', mdn + 'API/console/log_static'),
      ],
      [ref('console.table() for tracing a loop', 'console.table() pro trasování cyklu', mdn + 'API/console/table_static')],
      [ref('Math.round()', 'Math.round()', mdn + 'JavaScript/Reference/Global_Objects/Math/round')],
      [ref('The return statement', 'Příkaz return', mdn + 'JavaScript/Reference/Statements/return')],
      [ref('Number.isFinite()', 'Number.isFinite()', mdn + 'JavaScript/Reference/Global_Objects/Number/isFinite')],
    ],
  },
};

/** The checkpoint before each milestone: the same method step, on the
 * smallest piece that shows it. Each one fails on the untouched starter. */
export interface DebugCheckpoint { prompt: Localized; tests: CallTest[] }
export const DEBUG_CHECKPOINTS: Record<string, DebugCheckpoint[]> = {
  [DEBUG_CHALLENGE_ID]: [
    {
      prompt: text(
        'Verify the setup first. Press Run and read the Console: the scratch pad logs one parsed order. Then make the smallest change so that `parseOrder` trims the spaces around the item name — nothing else yet.',
        'Nejdřív si ověř prostředí. Stiskni Spustit a přečti si Konzoli: zápisník loguje jednu naparsovanou objednávku. Pak udělej nejmenší možnou změnu, aby `parseOrder` ořízla mezery kolem názvu položky — zatím nic víc.',
      ),
      tests: [
        check('parseOrder(" latte ,3,4.50").item', 'latte'),
        check('parseOrder("tea,2,1").item', 'tea'),
        check('parseOrder(" flat white ,1,3").item', 'flat white', ['only the outer spaces go', 'odejdou jen krajní mezery'], true),
        check('parseOrder("cake ,0,2.5").item', 'cake'),
      ],
    },
    {
      prompt: text(
        'Trace it by hand. For `["latte,1,4", "tea,2,1"]`, write down `order`, `running` and `totals` after each line, then log them and compare. Make `summarize` right for lines whose items are all different.',
        'Projdi to ručně. Pro `["latte,1,4", "tea,2,1"]` si po každém řádku zapiš `order`, `running` a `totals`, pak je zaloguj a porovnej. Oprav `summarize` pro řádky, jejichž položky jsou všechny různé.',
      ),
      tests: [
        check('summarize(["latte,1,4","tea,2,1"])', { latte: 4, tea: 2 }, ['the second item does not inherit the first total', 'druhá položka nedědí první součet']),
        check('summarize(["a,2,3"])', { a: 6 }),
        check('summarize([])', {}, undefined, true),
      ],
    },
    {
      prompt: text(
        '`percent` is a whole number: `10` means ten percent. Log `total * percent` for `applyDiscount(100, 50, 10)`, see why the result is absurd, and fix the arithmetic. Leave the threshold comparison for the next step.',
        '`percent` je celé číslo: `10` znamená deset procent. Zaloguj `total * percent` pro `applyDiscount(100, 50, 10)`, podívej se, proč je výsledek absurdní, a oprav aritmetiku. Porovnání s prahem nech na další krok.',
      ),
      tests: [
        check('applyDiscount(100, 50, 10)', 90, ['ten percent off, not ten times', 'deset procent dolů, ne desetinásobek']),
        check('applyDiscount(200, 50, 50)', 100),
        check('applyDiscount(20, 50, 10)', 20, ['below the threshold nothing changes', 'pod prahem se nic nemění'], true),
      ],
    },
    {
      prompt: text(
        'A pass-through logs and then returns. Make `trace(label, value)` return `value` unchanged, and prove it with `trace("x", 5)` in the scratch pad before you go on.',
        'Průchozí pomocník zaloguje a pak vrátí. Uprav `trace(label, value)`, aby vracela `value` beze změny, a než půjdeš dál, ověř to v zápisníku přes `trace("x", 5)`.',
      ),
      tests: [
        check('trace("x", 5)', 5, ['the value comes back', 'hodnota se vrátí']),
        check('trace("list", [1, 2])', [1, 2]),
        check('(() => { const seen = trace("seen", "ok"); return seen; })()', 'ok', ['so it can sit inside an expression', 'takže může stát uvnitř výrazu'], true),
      ],
    },
    {
      prompt: text(
        'Add `safeReport(lines, threshold, percent)` for input that is all good: return `{rows, problems}` where `rows` is `report(lines, threshold, percent)` and `problems` is an empty array. The bad lines come next.',
        'Přidej `safeReport(lines, threshold, percent)` pro vstup, který je celý v pořádku: vrať `{rows, problems}`, kde `rows` je `report(lines, threshold, percent)` a `problems` je prázdné pole. Špatné řádky přijdou v dalším kroku.',
      ),
      tests: [
        check('safeReport(["a,2,2"], 4, 50)', { rows: [{ item: 'a', total: 4, discounted: 2 }], problems: [] }),
        check('safeReport([], 1, 1)', { rows: [], problems: [] }, ['nothing in, nothing wrong', 'nic na vstupu, nic špatně'], true),
      ],
    },
  ],
};
