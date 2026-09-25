/** The debugging paths (#225): three short paths of five levels in the
 * `debugging` category, listed on the Coding home. They replace the café-orders
 * project (`js-evolving-debug`), whose stages stay reachable from old links.
 *
 * Each path is one file of five functions that already run and are wrong in
 * one way each. Every level fixes one of them, and the checks of the earlier
 * levels run again, so a learner's code carries forward exactly as in the
 * other short paths. The lesson of each level is a way of seeing the program
 * before changing it, so the first hint rung names the console technique and
 * the last rung before the solution is a documentation link.
 *
 * - Log it right (Easy): the console itself. Labelled logs with the object
 *   shorthand, the index beside the value and `console.table`, snapshots with
 *   `structuredClone`, `console.group`, `count` and `time`, and a `debug`
 *   helper that logs and hands its value back.
 * - Trace the state (Medium): watching state change. A range loop that stops
 *   early, a stale closure, `sort` in place, `forEach` with async callbacks,
 *   and NaN that surfaces two calls away from where it started.
 * - Edges and inputs (Medium, then Hard): input the code was not written for.
 *   `reduce` with no start value, `?.` and `??`, `==` and a blank field, money
 *   in floats, and a day that depends on the time zone.
 *
 * English only, with empty Czech fields like the other short paths. Task
 * bodies only; solutions and hidden checks live in
 * `lib/coding/solutions/paths-debugging.ts`. */

import type { Spec } from './evolving';
import { check, doc, en, mdn } from './path-helpers';

const CONSOLE = 'https://developer.mozilla.org/en-US/docs/Web/API/console/';

/* ── Log it right ─────────────────────────────────────────────────────── */

export const LOGGING_STARTER = `// Log it right. A small shop's basket. Every function below already runs,
// and each one is wrong in one way. Each level fixes one function: press Run,
// read the Console, and look before you change anything.

// Level 1
function basketSummary(basket) {
  // basket: [{ name, price, qty }]
  let lines = 0;
  let units = 0;
  let total = 0;
  for (const entry of basket) {
    lines += entry.qty;
    units += 1;
    total += entry.price * entry.qty;
    console.log(lines);
  }
  console.log(units);
  return { lines, units, total };
}

// Level 2
function cheapest(basket) {
  if (basket.length === 0) return null;
  let best = 0;
  for (let i = 1; i < basket.length; i++) {
    if (basket[i].price < basket[best].price) {
      best = basket[i].price;
    }
  }
  console.log(best);
  return basket[best].name;
}

// Level 3
function priceHistory(basket, changes) {
  const history = [];
  for (const change of changes) {
    const entry = basket.find((item) => item.name === change.name);
    entry.price = change.price;
    history.push(basket);
  }
  console.log(history);
  return history;
}

// Level 4
function addPoints(account, amount) {
  // One point for every whole unit spent.
  account.points += Math.floor(amount);
  return account.points;
}

function checkout(account, basket) {
  const total = basketSummary(basket).total;
  addPoints(account, total);
  console.log("checkout", total);
  return { total, points: addPoints(account, total) };
}

// Level 5
function debug(label, value) {
  console.log(label);
}

function bestSeller(orders) {
  if (orders.length === 0) return null;
  const totals = {};
  for (const order of orders) {
    totals[order.name] = (totals[order.name] ?? 0) + order.qty;
  }
  console.log(totals);
  const ranked = Object.entries(totals).sort((a, b) => a[1] - b[1]);
  console.log(ranked);
  return ranked[0][0];
}

// Scratch pad: change this and press Run.
console.log(basketSummary([{ name: "tea", price: 2, qty: 3 }, { name: "cake", price: 4, qty: 1 }]));
`;

const LOGGING: Spec = {
  starter: LOGGING_STARTER,
  focus: ['objects', 'for'],
  format: 'debug',
  difficulties: ['easy', 'easy', 'easy', 'easy', 'easy'],
  pitfalls: ['output-shape', 'tests', 'mutation', 'tests', 'missing-return'],
  prompts: [
    en('`basketSummary(basket)` should return `{ lines, units, total }`: how many lines the basket has, how many units they add up to, and what they cost. Press Run. The function prints bare numbers, and a column of numbers does not tell you which variable each one is. Replace the two logs with one `console.log({ lines, units })` inside the loop: the object shorthand prints each name beside its value. Then fix the function. `[{ name: "tea", price: 2, qty: 3 }, { name: "cake", price: 4, qty: 1 }]` gives `{ lines: 2, units: 4, total: 10 }`.'),
    en('`cheapest(basket)` should return the name of the cheapest entry: the first one on a tie, and `null` for an empty basket. It gets some baskets right and others wrong. Inside the loop, log the index beside what it points at with `console.log(i, best, basket[i].price)`. Then print the whole basket with `console.table(basket)`, which shows one row per entry under its index. Compare the two and find the variable that holds the wrong kind of value.'),
    en('`priceHistory(basket, changes)` applies each `{ name, price }` change in order. It should return a snapshot of the basket after each change and leave the basket you passed in as it was. Every change names an item in the basket. Log `history` at the end: every snapshot shows the last prices. An array is shared by reference, so pushing `basket` pushes the same array each time, and a later change shows up in every entry. DevTools in a browser do the same thing to a logged object you expand later. Copy the basket with `structuredClone` before you change it, and push a fresh copy after each change.'),
    en('`checkout(account, basket)` should add the basket\'s points to the account once, one point per whole unit of the total, and return `{ total, points }` with the account\'s new balance. The balance grows twice as fast as it should. Put `console.count("addPoints")` inside `addPoints`. Wrap the body of `checkout` in `console.group("checkout")` and `console.groupEnd()`, and time it with `console.time("checkout")` and `console.timeEnd("checkout")`. Run two checkouts and read the count under each heading. The time is tiny either way, so the count is the line that gives the bug away.'),
    en('Write `debug(label, value)`: log the label and the value with one `console.log`, then return the value unchanged, so a call can sit inside any expression. `debug("total", 2 + 3)` prints `total 5` and gives back `5`. In `bestSeller`, replace the two `console.log` lines by wrapping the expressions they print in `debug(...)`, and fix what it shows. `bestSeller(orders)` should return the name with the most units sold. The name seen first wins a tie, and no orders give `null`.'),
  ],
  hints: [
    en('Log with the object shorthand: `console.log({ lines, units })` prints `{"lines":3,"units":1}`, names and all. Put it inside the loop and watch which counter grows by `qty`.'),
    en('Log the index beside the value: `console.log(i, best, basket[i].price)`, then `console.table(basket)`. `best` should always be a number from the table\'s `(index)` column.'),
    en('Log a snapshot, not the live array: `console.log(structuredClone(basket))` prints the basket as it is at that line. Compare it with what ends up in `history`.'),
    en('Count the calls: `console.count("addPoints")` inside `addPoints` prints `addPoints: 1`, `addPoints: 2` and so on. Inside `console.group("checkout")`, each checkout\'s count sits under its own heading.'),
    en('`debug` logs with `console.log(label, value)` and then returns `value`. Once it returns, `debug("ranked", entries.sort(...))` prints the ranking without changing what the line computes.'),
  ],
  approaches: [
    [en('Press Run and read the numbers the function prints. Try to say which variable each one is.'), en('Replace both logs with one `console.log({ lines, units })` inside the loop and run again.'), en('Swap what the two counters add: `lines` grows by one per entry, `units` by the entry\'s `qty`. Then delete the log.')],
    [en('Run `cheapest` on `[{ name: "a", price: 2 }, { name: "b", price: 3 }, { name: "c", price: 1 }]` and note the wrong answer.'), en('Log `i`, `best` and `basket[i].price` on each pass, and compare `best` with the indexes `console.table(basket)` prints.'), en('`best` has to stay an index. Store `i`, not the price, when you find a cheaper entry.')],
    [en('Call `priceHistory` with two changes and log the result. Check whether the two snapshots differ.'), en('Log `history[0] === history[1]`. `true` means both entries are the same array.'), en('Clone the basket once at the start, change the clone, and push `structuredClone(copy)` after each change.')],
    [en('Add `console.count("addPoints")` to `addPoints` and run one checkout.'), en('Wrap `checkout` in `console.group` and `console.groupEnd`, add `console.time` and `console.timeEnd`, and run two checkouts.'), en('Call `addPoints` once, keep what it returns, and put that value in the result.')],
    [en('Write `debug`: one `console.log(label, value)`, then `return value`. Try `debug("x", 5)` in the scratch pad.'), en('In `bestSeller`, wrap `totals` and the sorted entries in `debug(...)` in place of the separate logs.'), en('Read the ranking `debug` prints. Sort so the largest total comes first; `sort` is stable, so ties keep the order the names first appeared.')],
  ],
  tests: [
    [
      check('basketSummary([{ name: "tea", price: 2, qty: 3 }, { name: "cake", price: 4, qty: 1 }])', { lines: 2, units: 4, total: 10 }),
      check('basketSummary([{ name: "pen", price: 1.5, qty: 2 }])', { lines: 1, units: 2, total: 3 }),
      check('basketSummary([{ name: "a", price: 1, qty: 1 }, { name: "b", price: 2, qty: 1 }])', { lines: 2, units: 2, total: 3 }, 'with every quantity at 1 the two counts agree'),
      check('basketSummary([])', { lines: 0, units: 0, total: 0 }, 'an empty basket', true),
      check('basketSummary([{ name: "tea", price: 2, qty: 0 }]).lines', 1, 'a line with quantity 0 is still a line', true),
    ],
    [
      check('cheapest([{ name: "tea", price: 3 }, { name: "cake", price: 2 }, { name: "pie", price: 5 }])', 'cake'),
      check('cheapest([{ name: "a", price: 2 }, { name: "b", price: 3 }, { name: "c", price: 1 }])', 'c'),
      check('cheapest([{ name: "jam", price: 4 }, { name: "bun", price: 1 }, { name: "egg", price: 2 }])', 'bun'),
      check('cheapest([{ name: "x", price: 2 }, { name: "y", price: 2 }])', 'x', 'a tie goes to the first entry', true),
      check('cheapest([])', null, 'an empty basket has no cheapest entry', true),
    ],
    [
      check('priceHistory([{ name: "tea", price: 2 }], [{ name: "tea", price: 3 }, { name: "tea", price: 4 }])', [[{ name: 'tea', price: 3 }], [{ name: 'tea', price: 4 }]]),
      check('(() => { const basket = [{ name: "tea", price: 2 }]; priceHistory(basket, [{ name: "tea", price: 9 }]); return basket[0].price; })()', 2, 'the basket you pass in keeps its prices'),
      check('priceHistory([{ name: "a", price: 1 }, { name: "b", price: 2 }], [{ name: "b", price: 5 }])', [[{ name: 'a', price: 1 }, { name: 'b', price: 5 }]]),
      check('priceHistory([{ name: "a", price: 1 }], [])', [], 'no changes, no snapshots', true),
      check('(() => { const history = priceHistory([{ name: "a", price: 1 }], [{ name: "a", price: 2 }, { name: "a", price: 3 }]); history[0][0].price = 99; return history[1][0].price; })()', 3, 'each snapshot is its own copy', true),
    ],
    [
      check('checkout({ points: 0 }, [{ name: "tea", price: 2, qty: 3 }])', { total: 6, points: 6 }),
      check('(() => { const account = { points: 5 }; checkout(account, [{ name: "cake", price: 2.5, qty: 2 }]); return account.points; })()', 10, 'the account gets the points once'),
      check('(() => { const account = { points: 0 }; checkout(account, [{ name: "a", price: 3, qty: 1 }]); return checkout(account, [{ name: "b", price: 4, qty: 1 }]); })()', { total: 4, points: 7 }),
      check('checkout({ points: 3 }, [])', { total: 0, points: 3 }, 'an empty basket earns nothing', true),
      check('checkout({ points: 0 }, [{ name: "gum", price: 0.99, qty: 1 }])', { total: 0.99, points: 0 }, 'points count whole units only', true),
    ],
    [
      check('debug("total", 42)', 42, 'debug hands the value back'),
      check('debug("list", [1, 2])', [1, 2]),
      check('debug("n", 2) * 3', 6, 'so it can sit inside an expression'),
      check('bestSeller([{ name: "tea", qty: 2 }, { name: "cake", qty: 5 }, { name: "tea", qty: 1 }])', 'cake'),
      check('bestSeller([{ name: "a", qty: 1 }, { name: "b", qty: 1 }])', 'a', 'a tie goes to the name seen first', true),
      check('bestSeller([])', null, 'no orders, no best seller', true),
      check('(() => { const box = { n: 1 }; return debug("box", box) === box; })()', true, 'the same object comes back, not a copy', true),
    ],
  ],
  references: [
    [doc('console.log()', CONSOLE + 'log_static'), mdn('Object initializer: shorthand property names', 'Operators/Object_initializer')],
    [doc('console.table()', CONSOLE + 'table_static'), mdn('for', 'Statements/for')],
    [doc('structuredClone()', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone'), mdn('Array.prototype.find()', 'Global_Objects/Array/find')],
    [doc('console.count()', CONSOLE + 'count_static'), doc('console.group()', CONSOLE + 'group_static'), doc('console.time()', CONSOLE + 'time_static')],
    [mdn('return', 'Statements/return'), mdn('Array.prototype.sort()', 'Global_Objects/Array/sort')],
  ],
};

/* ── Trace the state ──────────────────────────────────────────────────── */

export const TRACING_STARTER = `// Trace the state. A shared-expenses app for a trip. Every function below
// already runs, and each one is wrong in one way. Each level fixes one
// function: log the state as it changes, and find the line where it stops
// being what you expected.

// Level 1
function weeklyTotals(daily) {
  // daily: one amount per day.
  const totals = [];
  for (let start = 0; start + 7 < daily.length; start += 7) {
    let sum = 0;
    for (let day = start; day < start + 7; day++) {
      sum += daily[day];
    }
    totals.push(sum);
  }
  return totals;
}

// Level 2
function makeReminders(names) {
  const reminders = [];
  for (var i = 0; i < names.length; i++) {
    reminders.push(() => \`\${i + 1}. \${names[i]} owes you\`);
  }
  return reminders;
}

// Level 3
function largestExpenses(expenses, n) {
  return expenses.sort((a, b) => b.amount - a.amount).slice(0, n);
}

// Level 4
async function loadReceipts(ids, fetchReceipt) {
  const receipts = [];
  ids.forEach(async (id) => {
    receipts.push(await fetchReceipt(id));
  });
  return receipts;
}

// Level 5
function readAmount(field) {
  // field: { label, value }, where value is the text typed into a form.
  return field.value.trim();
}

function sumAmounts(fields) {
  let total = 0;
  for (const field of fields) {
    total += readAmount(field);
  }
  return total;
}

function withTip(fields, percent) {
  const total = sumAmounts(fields);
  return Math.round(total * (1 + percent / 100) * 100) / 100;
}

// Scratch pad: change this and press Run.
console.log(weeklyTotals([5, 5, 5, 5, 5, 5, 5, 10]));
`;

const FETCH_BY_ID = 'const fetchReceipt = (id) => new Promise((done) => setTimeout(() => done({ id, amount: id * 10 }), 30 - id * 10));';
const FETCH_LOGGED = 'const events = []; const fetchReceipt = (id) => { events.push("start " + id); return new Promise((done) => setTimeout(() => { events.push("end " + id); done({ id }); }, 10)); };';

const TRACING: Spec = {
  starter: TRACING_STARTER,
  focus: ['for', 'closures', 'sort', 'async-await'],
  format: 'debug',
  difficulties: ['medium', 'medium', 'medium', 'medium', 'medium'],
  pitfalls: ['boundary', 'tests', 'mutation', 'tests', 'output-shape'],
  prompts: [
    en('`weeklyTotals(daily)` takes one amount per day and should return the total of each run of seven days, with a shorter last week getting a total of its own. Eight days of 5, 5, 5, 5, 5, 5, 5, 10 give `[35, 10]`. Log where each week starts and ends with `console.log({ start, end: start + 7 })` at the top of the outer loop, and compare the weeks it prints with the weeks the input has. There are two range bugs, and the second only shows once the first is fixed.'),
    en('`makeReminders(names)` returns one function per name. Calling a reminder returns its line: `makeReminders(["Ann", "Ben"])[1]()` gives `"2. Ben owes you"`. Every reminder says the same wrong thing. Log `{ i }` inside the arrow function, where the reminder runs, and compare it with the `i` the loop had when it created that reminder. A callback reads a variable when it runs, not when it was made.'),
    en('`largestExpenses(expenses, n)` returns the `n` largest expenses, largest first, with equal amounts in their original order. Its answers are right, and the app still breaks: after a call, the list you passed in comes out in a different order. Log the labels before and after the call with `console.log("before", expenses.map((e) => e.label))`. `map` builds a new array, so the line you print is a snapshot. Fix it so the caller\'s list keeps its order.'),
    en('`loadReceipts(ids, fetchReceipt)` should start every request at once and resolve to the receipts in the order of `ids`. `fetchReceipt(id)` returns a promise. It resolves to an empty list. Log `"returning"` just before the `return` and `"got", id` inside the callback, then await a call in the scratch pad and read the order of the lines. Fetching one receipt at a time with `await` inside a loop gives the right list but runs the requests one after another. Wrap it in `console.time("receipts")` and `console.timeEnd("receipts")` to compare the two.'),
    en('`withTip(fields, percent)` adds a tip to the amounts typed into a form and rounds to cents. Each field is `{ label, value }`, where `value` is text that holds a number, or is blank for 0. One field works. Two fields give `NaN`. `NaN` shows up in `withTip`, but it starts two calls earlier. Log the value and its type where each function hands its result on, for example `console.log({ total, type: typeof total })` in `sumAmounts`. Fix it where the trouble starts, not where it shows.'),
  ],
  hints: [
    en('Log the range of each pass: `console.log({ start, end: start + 7 })` at the top of the outer loop. With 7 or 14 days, count how many weeks it prints.'),
    en('Log inside the callback, where it runs: `console.log({ i })` in the arrow function. Every reminder prints the same `i`, the value the loop ended on.'),
    en('Log a snapshot before and after the call: `console.log("before", expenses.map((e) => e.label))`, then the same line after. If the order changed, the function sorted your list in place.'),
    en('Log both ends of the story: `console.log("returning", receipts.length)` before the `return` and `console.log("got", id)` in the callback. `returning` prints first, with 0.'),
    en('Log the value and its type at each hand-over: `console.log({ total, type: typeof total })` in `sumAmounts`. The first line that says `string` is where the trouble starts.'),
  ],
  approaches: [
    [en('Call `weeklyTotals` with 7, 8 and 14 days and note which weeks go missing.'), en('Fix the outer condition so a week starts while `start` is still inside the array.'), en('Stop the inner loop at the end of the array too, so a short last week adds only the days it has.')],
    [en('Make two reminders and call both. Log `{ i }` inside the arrow function.'), en('Ask how many `i` variables the loop has. `var` gives the whole function one; `let` gives each pass its own.'), en('Declare the loop variable with `let`, or build the reminders with `names.map((name, index) => ...)`.')],
    [en('Keep a list, call `largestExpenses` on it, and log its labels before and after.'), en('Read the MDN page for `sort`: it sorts the array in place and returns the same array.'), en('Sort a copy: `[...expenses]` or `expenses.toSorted(...)`, then take the first `n`.')],
    [en('Log "returning" before the return and "got" in the callback. Run it and read the order.'), en('`forEach` ignores the promises its callback returns, so nothing waits for them. Collect the promises with `map` instead.'), en('Return `Promise.all` of those promises: every request starts at once, and the results keep the order of `ids`.')],
    [en('Log `{ value: readAmount(field) }` and its `typeof` for each field.'), en('Log `total` in `sumAmounts`. Text plus text glues the two together, and "04.502.25" is not a number.'), en('Turn the text into a number in `readAmount`, where it enters. `Number("")` is 0, which covers a blank field.')],
  ],
  tests: [
    [
      check('weeklyTotals([1, 1, 1, 1, 1, 1, 1])', [7], 'exactly one week'),
      check('weeklyTotals([2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3])', [14, 21]),
      check('weeklyTotals([1, 2, 3, 4, 5, 6, 7, 8, 9])', [28, 17], 'a short last week gets its own total'),
      check('weeklyTotals([])', [], 'no days, no weeks', true),
      check('weeklyTotals([4])', [4], 'one day is a week of its own', true),
    ],
    [
      check('makeReminders(["Ann", "Ben"]).map((remind) => remind())', ['1. Ann owes you', '2. Ben owes you']),
      check('makeReminders(["Ann", "Ben", "Cy"])[1]()', '2. Ben owes you'),
      check('makeReminders(["a", "b", "c"]).length', 3),
      check('makeReminders(["Solo"])[0]()', '1. Solo owes you', 'one name', true),
      check('makeReminders([]).length', 0, 'no names, no reminders', true),
    ],
    [
      check('largestExpenses([{ label: "taxi", amount: 12 }, { label: "lunch", amount: 30 }, { label: "coffee", amount: 4 }], 2)', [{ label: 'lunch', amount: 30 }, { label: 'taxi', amount: 12 }]),
      check('(() => { const expenses = [{ label: "a", amount: 1 }, { label: "b", amount: 3 }, { label: "c", amount: 2 }]; largestExpenses(expenses, 1); return expenses.map((expense) => expense.label); })()', ['a', 'b', 'c'], 'the list you pass in keeps its order'),
      check('largestExpenses([{ label: "a", amount: 5 }, { label: "b", amount: 5 }, { label: "c", amount: 1 }], 2)', [{ label: 'a', amount: 5 }, { label: 'b', amount: 5 }], 'equal amounts keep their order'),
      check('largestExpenses([{ label: "a", amount: 1 }], 3)', [{ label: 'a', amount: 1 }], 'n larger than the list', true),
      check('largestExpenses([{ label: "a", amount: 1 }], 0)', [], 'n of zero', true),
    ],
    [
      { ...check(`(async () => { ${FETCH_BY_ID} return loadReceipts([1, 2], fetchReceipt); })()`, [{ id: 1, amount: 10 }, { id: 2, amount: 20 }], 'the receipts, in the order of ids'), async: true },
      { ...check(`(async () => { ${FETCH_LOGGED} await loadReceipts([1, 2, 3], fetchReceipt); return events; })()`, ['start 1', 'start 2', 'start 3', 'end 1', 'end 2', 'end 3'], 'every request starts before the first one ends'), async: true },
      { ...check('(async () => { const fetchReceipt = (id) => new Promise((done) => setTimeout(() => done({ id }), id)); return (await loadReceipts([3, 1, 2], fetchReceipt)).map((receipt) => receipt.id); })()', [3, 1, 2], 'the order of ids, not the order they finish'), async: true },
      { ...check('(async () => loadReceipts([], (id) => Promise.resolve({ id })))()', [], 'no ids, no requests', true), async: true },
    ],
    [
      check('withTip([{ label: "lunch", value: "4.50" }, { label: "coffee", value: "2.30" }], 10)', 7.48),
      check('sumAmounts([{ label: "a", value: "1" }, { label: "b", value: "2" }])', 3),
      check('typeof sumAmounts([{ label: "a", value: "4.50" }])', 'number', 'the total is a number, not text'),
      check('readAmount({ label: "tea", value: " 3.5 " })', 3.5),
      check('sumAmounts([{ label: "blank", value: "" }, { label: "b", value: "2" }])', 2, 'a blank field counts as 0', true),
      check('withTip([], 15)', 0, 'no fields', true),
    ],
  ],
  references: [
    [mdn('for', 'Statements/for'), doc('console.log()', CONSOLE + 'log_static')],
    [doc('Closures', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures'), mdn('let', 'Statements/let')],
    [mdn('Array.prototype.sort()', 'Global_Objects/Array/sort'), mdn('Array.prototype.toSorted()', 'Global_Objects/Array/toSorted')],
    [mdn('Promise.all()', 'Global_Objects/Promise/all'), doc('console.time()', CONSOLE + 'time_static')],
    [mdn('NaN', 'Global_Objects/NaN'), mdn('Number() constructor', 'Global_Objects/Number/Number')],
  ],
};

/* ── Edges and inputs ─────────────────────────────────────────────────── */

export const EDGES_STARTER = `// Edges and inputs. Code that reads orders, profiles and form fields from
// outside. Every function below works on the input it was written for and
// goes wrong on input it was not. Each level fixes one function: log the
// input exactly as it arrives, before you trust it.

// Level 1
function orderTotal(orders) {
  // orders: [{ id, amount }]
  return orders.reduce((sum, order) => sum + order.amount);
}

// Level 2
function profileLine(user) {
  const name = user.name || "Guest";
  const city = user.address.city || "no city";
  const credits = user.credits || "unknown";
  return \`\${name} · \${city} · \${credits} credits\`;
}

// Level 3
function stockStatus(text) {
  // text: what the stock field holds, or undefined when the form has none.
  if (text == 0) return "sold out";
  if (text == undefined) return "missing";
  return "in stock";
}

// Level 4
function splitBill(prices, people) {
  // prices in euros
  let total = 0;
  for (const price of prices) total += price;
  const share = total / people;
  return Array.from({ length: people }, () => share);
}

// Level 5
function ordersPerDay(timestamps) {
  // timestamps: ISO strings with an offset, e.g. "2026-03-02T00:30:00+01:00"
  const counts = {};
  for (const stamp of timestamps) {
    const day = stamp.slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

// Scratch pad: change this and press Run.
console.log(orderTotal([{ id: 1, amount: 5 }, { id: 2, amount: 7 }]));
`;

const EDGES: Spec = {
  starter: EDGES_STARTER,
  focus: ['reduce', 'objects', 'strings'],
  format: 'debug',
  // Levels 1 to 4 read Medium. Level 5 keeps its position label, Hard: every
  // stage is tier 2, where an authored Hard is refused.
  difficulties: ['medium', 'medium', 'medium', 'medium'],
  pitfalls: ['boundary', 'runtime', 'boundary', 'tests', 'boundary'],
  prompts: [
    en('`orderTotal(orders)` should return the sum of the orders\' amounts, and `0` when there are none. The scratch pad prints `[object Object]7` for two orders. Log what the reducer receives with `console.log({ sum, order })` inside the callback. Without a start value, `reduce` uses the first element as the first `sum`, and with no orders there is no first element, so it throws. Give it the value a sum starts from.'),
    en('`profileLine(user)` should return a line like `"Ann · Brno · 3 credits"`. A missing name reads `Guest`, a missing address or city reads `no city`, and missing credits (`undefined` or `null`) read `unknown`. A real `0` stays `0`. Some users throw and some show the wrong words. Log the input before you read into it: `console.log({ address: user.address, credits: user.credits })`. Use `?.` where a whole object can be missing and `??` where `0` is a real value.'),
    en('`stockStatus(text)` reads a stock field from a form. `text` is the field\'s text, or `undefined` when the form has no field. A missing or blank field reads `"missing"`, a zero such as `"0"` reads `"sold out"`, and any other number reads `"in stock"`. A blank field reads `"sold out"` today. Log how the comparisons see each input: `console.log({ text, loose: text == 0, strict: text === "0" })`. `==` turns a blank string into `0` before it compares. Test for blank first, then compare numbers with `===`. `if (!text)` does not help with `"0"`, because every non-empty string is truthy, `"0"` included.'),
    en('`splitBill(prices, people)` takes prices in euros and returns each person\'s share in euros. The shares add up to the exact total, to the cent, and the first people pay any leftover cents: `splitBill([10], 3)` gives `[3.34, 3.33, 3.33]`. Log the total with `console.log({ total })`: `0.1 + 0.2` prints `0.30000000000000004`. Floats cannot store most cent amounts exactly. Count in whole cents with `Math.round(price * 100)`, split the cents, and divide by 100 only for the answer.'),
    en('`ordersPerDay(timestamps)` counts orders per UTC day. Each timestamp is an ISO string with an offset, and the result maps `"YYYY-MM-DD"` to a count, with days in the order they first appear. An order at `"2026-03-02T00:30:00+01:00"` was placed at 23:30 UTC on 1 March, but the code counts it on the 2nd. Log the text beside the instant it stands for: `console.log({ stamp, utc: new Date(stamp).toISOString() })`. Parse to a `Date`, which is one moment in time, work out the day in UTC, and turn it into text only at the end.'),
  ],
  hints: [
    en('Log what `reduce` hands the callback: `console.log({ sum, order })` inside it. On the first call `sum` is an order object, not a number.'),
    en('Log the input before reading into it: `console.log({ address: user.address, credits: user.credits })`. `undefined.city` throws, and `0 || "unknown"` throws away a real 0.'),
    en('Log how each comparison sees the input: `console.log({ text, loose: text == 0, strict: text === "0" })`. Try `""`, `"   "` and `"0"`.'),
    en('Log the float: `console.log({ total })`, or `total.toFixed(20)` to see every digit. `0.1 + 0.2` is not `0.3`. Whole cents add up exactly.'),
    en('Log the instant beside the text: `console.log({ stamp, utc: new Date(stamp).toISOString() })`. Near midnight the first ten characters of each disagree.'),
  ],
  approaches: [
    [en('Call `orderTotal` with one order, then two, then none, and log what comes back.'), en('Log `{ sum, order }` in the callback and read the first line.'), en('Pass `0` as the second argument of `reduce`.')],
    [en('Call `profileLine` with no `address`, with `address: null` and with `credits: 0`, and log what arrives.'), en('Read `city` with `user.address?.city`, which stops at a missing address.'), en('Use `??` for the fallbacks: it replaces only `null` and `undefined`, so `0` stays `0`.')],
    [en('Log `text == 0` for `""`, `"   "`, `"0"` and `"12"`.'), en('Handle a missing or blank field first: `undefined`, or text that is empty after `trim()`.'), en('Convert what is left with `Number(text)` and compare it with `=== 0`.')],
    [en('Log `0.1 + 0.2` and the total for `[10]` split three ways.'), en('Add the prices as whole cents: `Math.round(price * 100)`.'), en('Give everyone `Math.floor(cents / people)` cents, add one cent to the first `cents % people` people, and divide each share by 100.')],
    [en('Log `stamp.slice(0, 10)` beside `new Date(stamp).toISOString()` for a time just after midnight.'), en('The ISO text is the local time where the order was placed. `toISOString()` always prints UTC.'), en('Count by `new Date(stamp).toISOString().slice(0, 10)`.')],
  ],
  tests: [
    [
      check('orderTotal([{ id: 1, amount: 5 }, { id: 2, amount: 7 }])', 12),
      check('orderTotal([{ id: 1, amount: 5 }])', 5, 'one order is its own total'),
      check('typeof orderTotal([{ id: 1, amount: 1 }, { id: 2, amount: 2 }])', 'number', 'the total is a number'),
      check('orderTotal([{ id: 1, amount: 2.5 }, { id: 2, amount: 0 }, { id: 3, amount: 1 }])', 3.5),
      check('orderTotal([])', 0, 'no orders total 0', true),
    ],
    [
      check('profileLine({ name: "Ann", address: { city: "Brno" }, credits: 3 })', 'Ann · Brno · 3 credits'),
      check('profileLine({ name: "Ben", credits: 5 })', 'Ben · no city · 5 credits', 'no address at all'),
      check('profileLine({ name: "Cy", address: { city: "Oslo" }, credits: 0 })', 'Cy · Oslo · 0 credits', '0 credits is a real number', true),
      check('profileLine({ address: {} })', 'Guest · no city · unknown credits', 'nothing filled in', true),
      check('profileLine({ name: "Di", address: null, credits: null })', 'Di · no city · unknown credits', 'null reads as missing', true),
    ],
    [
      check('stockStatus("")', 'missing', 'a blank field is missing, not zero'),
      check('stockStatus("0")', 'sold out'),
      check('stockStatus("12")', 'in stock'),
      check('stockStatus("   ")', 'missing', 'spaces only is blank', true),
      check('stockStatus(undefined)', 'missing', 'no field at all', true),
      check('stockStatus(" 0 ")', 'sold out', 'spaces around a zero', true),
    ],
    [
      check('splitBill([0.1, 0.2], 1)', [0.3], '0.1 + 0.2 is 0.30 to the cent'),
      check('splitBill([10], 3)', [3.34, 3.33, 3.33], 'the first person pays the leftover cent'),
      check('splitBill([4, 2], 2)', [3, 3]),
      check('splitBill([1.15, 2.1], 2)', [1.63, 1.62]),
      check('splitBill([0.05], 2)', [0.03, 0.02], 'five cents between two', true),
      check('splitBill([], 2)', [0, 0], 'nothing to pay', true),
    ],
    [
      check('ordersPerDay(["2026-03-01T10:00:00Z", "2026-03-01T23:59:00Z"])', { '2026-03-01': 2 }),
      check('ordersPerDay(["2026-03-02T00:30:00+01:00"])', { '2026-03-01': 1 }, 'half past midnight in Prague is still the 1st in UTC'),
      check('ordersPerDay(["2026-03-01T23:30:00-02:00"])', { '2026-03-02': 1 }),
      check('ordersPerDay(["2026-03-01T12:00:00Z", "2026-03-02T00:30:00+01:00", "2026-03-02T09:00:00Z"])', { '2026-03-01': 2, '2026-03-02': 1 }),
      check('ordersPerDay(["2026-12-31T23:30:00-01:00"])', { '2027-01-01': 1 }, 'the year can change too', true),
      check('ordersPerDay([])', {}, 'no orders', true),
    ],
  ],
  references: [
    [mdn('Array.prototype.reduce()', 'Global_Objects/Array/reduce'), doc('console.log()', CONSOLE + 'log_static')],
    [mdn('Optional chaining (?.)', 'Operators/Optional_chaining'), mdn('Nullish coalescing (??)', 'Operators/Nullish_coalescing')],
    [doc('Equality comparisons and sameness', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness'), doc('Truthy', 'https://developer.mozilla.org/en-US/docs/Glossary/Truthy')],
    [doc('Floating point number', 'https://developer.mozilla.org/en-US/docs/Glossary/Floating_point_number'), mdn('Math.round()', 'Global_Objects/Math/round')],
    [mdn('Date.prototype.toISOString()', 'Global_Objects/Date/toISOString'), mdn('Date', 'Global_Objects/Date')],
  ],
};

/** The three debugging paths, keyed by path id. */
export const DEBUGGING_PATHS: Record<string, Spec> = {
  'js-path-logging': LOGGING,
  'js-path-tracing': TRACING,
  'js-path-edges': EDGES,
};
