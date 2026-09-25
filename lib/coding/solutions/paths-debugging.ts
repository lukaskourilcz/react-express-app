/** Server-only solutions for the three debugging paths (#225).
 *
 * The starter already holds every level's function, broken, so a level's
 * solution repairs that level and every earlier one and leaves the later ones
 * as the starter has them (`repairLevels`). The reference is the smallest
 * repair, with a comment on what the level's log showed. The junior board
 * spells each step out; the senior board uses the built-in that fits. The
 * content contract proves all three against every visible and hidden check,
 * and proves that each level's starting code fails that level's own checks. */

import type { CodingSolution } from '../types';
import { LOGGING_STARTER, TRACING_STARTER, EDGES_STARTER } from '../tasks/paths-debugging';
import { repairLevels, type Boards, type Hidden } from './path-boards';

/* ── Log it right ─────────────────────────────────────────────────────── */

const LOGGING: Boards = {
  reference: [
    `function basketSummary(basket) {
  // basket: [{ name, price, qty }]
  // console.log({ lines, units }) inside the loop showed lines growing by
  // qty and units by one: the two counters had swapped jobs.
  let lines = 0;
  let units = 0;
  let total = 0;
  for (const entry of basket) {
    lines += 1;
    units += entry.qty;
    total += entry.price * entry.qty;
  }
  return { lines, units, total };
}`,
    `function cheapest(basket) {
  if (basket.length === 0) return null;
  // console.log(i, best, basket[i].price) showed best holding a price, not
  // an index. Keep the index and read the price through it.
  let best = 0;
  for (let i = 1; i < basket.length; i++) {
    if (basket[i].price < basket[best].price) {
      best = i;
    }
  }
  return basket[best].name;
}`,
    `function priceHistory(basket, changes) {
  // Logging history showed every snapshot with the last prices: each push
  // added the same array. Change a copy, and push a fresh copy each time.
  const copy = structuredClone(basket);
  const history = [];
  for (const change of changes) {
    const entry = copy.find((item) => item.name === change.name);
    entry.price = change.price;
    history.push(structuredClone(copy));
  }
  return history;
}`,
    `function addPoints(account, amount) {
  // One point for every whole unit spent.
  account.points += Math.floor(amount);
  return account.points;
}

function checkout(account, basket) {
  // console.count("addPoints") printed 2 under every checkout heading: the
  // return line called addPoints again just to read the balance.
  const total = basketSummary(basket).total;
  const points = addPoints(account, total);
  return { total, points };
}`,
    `function debug(label, value) {
  // Log, then hand the value back, so debug(...) can wrap any expression.
  console.log(label, value);
  return value;
}

function bestSeller(orders) {
  if (orders.length === 0) return null;
  const totals = {};
  for (const order of orders) {
    totals[order.name] = (totals[order.name] ?? 0) + order.qty;
  }
  // debug("ranked", ...) printed the smallest total first: the comparator
  // sorted ascending. b - a puts the largest first, and sort is stable, so
  // the name seen first still wins a tie.
  const ranked = debug("ranked", Object.entries(debug("totals", totals)).sort((a, b) => b[1] - a[1]));
  return ranked[0][0];
}`,
  ],
  junior: [
    `function basketSummary(basket) {
  let lines = 0;
  let units = 0;
  let total = 0;
  for (let i = 0; i < basket.length; i++) {
    const entry = basket[i];
    lines = lines + 1;
    units = units + entry.qty;
    total = total + entry.price * entry.qty;
  }
  return { lines: lines, units: units, total: total };
}`,
    `function cheapest(basket) {
  if (basket.length === 0) {
    return null;
  }
  let bestIndex = 0;
  for (let i = 1; i < basket.length; i++) {
    const price = basket[i].price;
    const bestPrice = basket[bestIndex].price;
    if (price < bestPrice) {
      bestIndex = i;
    }
  }
  return basket[bestIndex].name;
}`,
    `function priceHistory(basket, changes) {
  const current = [];
  for (let i = 0; i < basket.length; i++) {
    current.push({ ...basket[i] });
  }
  const history = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    for (let j = 0; j < current.length; j++) {
      if (current[j].name === change.name) {
        current[j].price = change.price;
      }
    }
    const snapshot = [];
    for (let j = 0; j < current.length; j++) {
      snapshot.push({ ...current[j] });
    }
    history.push(snapshot);
  }
  return history;
}`,
    `function addPoints(account, amount) {
  const earned = Math.floor(amount);
  account.points = account.points + earned;
  return account.points;
}

function checkout(account, basket) {
  const summary = basketSummary(basket);
  const total = summary.total;
  const points = addPoints(account, total);
  return { total: total, points: points };
}`,
    `function debug(label, value) {
  console.log(label, value);
  return value;
}

function bestSeller(orders) {
  if (orders.length === 0) {
    return null;
  }
  const totals = {};
  const names = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (totals[order.name] === undefined) {
      totals[order.name] = 0;
      names.push(order.name);
    }
    totals[order.name] = totals[order.name] + order.qty;
  }
  let best = names[0];
  for (let i = 1; i < names.length; i++) {
    if (totals[names[i]] > totals[best]) {
      best = names[i];
    }
  }
  return best;
}`,
  ],
  senior: [
    `function basketSummary(basket) {
  return {
    lines: basket.length,
    units: basket.reduce((sum, { qty }) => sum + qty, 0),
    total: basket.reduce((sum, { price, qty }) => sum + price * qty, 0),
  };
}`,
    `function cheapest(basket) {
  if (basket.length === 0) return null;
  return basket.reduce((best, entry) => (entry.price < best.price ? entry : best)).name;
}`,
    `function priceHistory(basket, changes) {
  let current = structuredClone(basket);
  return changes.map(({ name, price }) => {
    current = current.map((item) => (item.name === name ? { ...item, price } : item));
    return structuredClone(current);
  });
}`,
    `const addPoints = (account, amount) => (account.points += Math.floor(amount));

function checkout(account, basket) {
  const { total } = basketSummary(basket);
  return { total, points: addPoints(account, total) };
}`,
    `const debug = (label, value) => (console.log(label, value), value);

function bestSeller(orders) {
  const totals = new Map();
  for (const { name, qty } of orders) totals.set(name, (totals.get(name) ?? 0) + qty);
  const [best] = [...totals].sort((a, b) => b[1] - a[1]);
  return best ? best[0] : null;
}`,
  ],
};

/** Reads what a call printed, from inside the call: every console method
 * that prints a line is swapped for one that records it, and put back after.
 * The debug helper's check needs both halves of its job, the line it prints
 * and the value it returns. */
const printedBy = (call: string) => `(() => { const printed = []; const methods = ["log", "info", "debug", "warn", "error"]; const kept = methods.map((name) => console[name]); methods.forEach((name) => { console[name] = (...args) => { printed.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")); }; }); try { const back = ${call}; return { back, printed }; } finally { methods.forEach((name, index) => { console[name] = kept[index]; }); } })()`;

const LOGGING_HIDDEN: Hidden = [
  [['basketSummary([{ name: "x", price: 3, qty: 5 }, { name: "y", price: 1, qty: 2 }])', { lines: 2, units: 7, total: 17 }], ['Object.keys(basketSummary([]))', ['lines', 'units', 'total']]],
  [['cheapest([{ name: "p", price: 1 }, { name: "q", price: 0 }])', 'q'], ['cheapest([{ name: "solo", price: 9 }])', 'solo']],
  [['priceHistory([{ name: "a", price: 1 }, { name: "b", price: 1 }], [{ name: "a", price: 2 }, { name: "b", price: 3 }])', [[{ name: 'a', price: 2 }, { name: 'b', price: 1 }], [{ name: 'a', price: 2 }, { name: 'b', price: 3 }]]], ['(() => { const basket = [{ name: "a", price: 1 }]; return priceHistory(basket, [{ name: "a", price: 2 }])[0] !== basket; })()', true]],
  [['checkout({ points: 1 }, [{ name: "a", price: 1.5, qty: 3 }])', { total: 4.5, points: 5 }], ['(() => { const account = { points: 0 }; checkout(account, [{ name: "a", price: 7, qty: 1 }]); checkout(account, []); return account.points; })()', 7]],
  [
    // One printed line that names the label and shows the value, and the
    // value itself back. `console.log(label, value)` and
    // `console.log({ [label]: value })` both pass.
    [`(() => { const { back, printed } = ${printedBy('debug("total", 42)')}; return [back, printed.length, printed.join(" ").includes("total"), printed.join(" ").includes("42")]; })()`, [42, 1, true, true]],
    ['debug("zero", 0)', 0],
    ['bestSeller([{ name: "x", qty: 1 }, { name: "y", qty: 4 }, { name: "x", qty: 4 }])', 'x'],
  ],
];

/* ── Trace the state ──────────────────────────────────────────────────── */

const TRACING: Boards = {
  reference: [
    `function weeklyTotals(daily) {
  // daily: one amount per day.
  // console.log({ start, end: start + 7 }) showed the last week never
  // started: the condition stopped a week early. The inner loop also has to
  // stop at the end of the array, or a short last week adds undefined.
  const totals = [];
  for (let start = 0; start < daily.length; start += 7) {
    let sum = 0;
    for (let day = start; day < Math.min(start + 7, daily.length); day++) {
      sum += daily[day];
    }
    totals.push(sum);
  }
  return totals;
}`,
    `function makeReminders(names) {
  // console.log({ i }) inside a reminder printed the same i for every
  // reminder: var gives the whole loop one i, and by the time a reminder
  // runs the loop has finished. let gives each pass its own i.
  const reminders = [];
  for (let i = 0; i < names.length; i++) {
    reminders.push(() => \`\${i + 1}. \${names[i]} owes you\`);
  }
  return reminders;
}`,
    `function largestExpenses(expenses, n) {
  // Logging the labels before and after the call showed the caller's list
  // reordered: sort works in place. Sort a copy.
  return [...expenses].sort((a, b) => b.amount - a.amount).slice(0, n);
}`,
    `async function loadReceipts(ids, fetchReceipt) {
  // "returning" printed before any "got": forEach does not wait for async
  // callbacks, so the function handed back an empty list. Promise.all
  // starts every request at once and keeps the order of ids.
  return Promise.all(ids.map((id) => fetchReceipt(id)));
}`,
    `function readAmount(field) {
  // field: { label, value }, where value is the text typed into a form.
  // console.log({ total, type: typeof total }) in sumAmounts printed a
  // string, "04.502.25": the text was never turned into a number, so +=
  // glued the amounts together, and withTip's arithmetic on that text gave
  // NaN. Convert where the text comes in. Number("") is 0.
  return Number(field.value);
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
}`,
  ],
  junior: [
    `function weeklyTotals(daily) {
  const totals = [];
  let sum = 0;
  let daysInWeek = 0;
  for (let day = 0; day < daily.length; day++) {
    sum = sum + daily[day];
    daysInWeek = daysInWeek + 1;
    if (daysInWeek === 7) {
      totals.push(sum);
      sum = 0;
      daysInWeek = 0;
    }
  }
  if (daysInWeek > 0) {
    totals.push(sum);
  }
  return totals;
}`,
    `function makeReminders(names) {
  const reminders = [];
  for (let i = 0; i < names.length; i++) {
    const position = i + 1;
    const name = names[i];
    const reminder = function () {
      return position + ". " + name + " owes you";
    };
    reminders.push(reminder);
  }
  return reminders;
}`,
    `function largestExpenses(expenses, n) {
  const copy = expenses.slice();
  copy.sort(function (a, b) {
    return b.amount - a.amount;
  });
  const result = [];
  for (let i = 0; i < n && i < copy.length; i++) {
    result.push(copy[i]);
  }
  return result;
}`,
    `async function loadReceipts(ids, fetchReceipt) {
  const pending = [];
  for (let i = 0; i < ids.length; i++) {
    pending.push(fetchReceipt(ids[i]));
  }
  const receipts = [];
  for (let i = 0; i < pending.length; i++) {
    const receipt = await pending[i];
    receipts.push(receipt);
  }
  return receipts;
}`,
    `function readAmount(field) {
  const text = field.value.trim();
  if (text === "") {
    return 0;
  }
  return parseFloat(text);
}

function sumAmounts(fields) {
  let total = 0;
  for (let i = 0; i < fields.length; i++) {
    const amount = readAmount(fields[i]);
    total = total + amount;
  }
  return total;
}

function withTip(fields, percent) {
  const total = sumAmounts(fields);
  const factor = 1 + percent / 100;
  return Math.round(total * factor * 100) / 100;
}`,
  ],
  senior: [
    `function weeklyTotals(daily) {
  const weeks = Math.ceil(daily.length / 7);
  return Array.from({ length: weeks }, (_, week) =>
    daily.slice(week * 7, week * 7 + 7).reduce((sum, amount) => sum + amount, 0));
}`,
    `const makeReminders = (names) => names.map((name, index) => () => \`\${index + 1}. \${name} owes you\`);`,
    `const largestExpenses = (expenses, n) => expenses.toSorted((a, b) => b.amount - a.amount).slice(0, n);`,
    `const loadReceipts = (ids, fetchReceipt) => Promise.all(ids.map((id) => fetchReceipt(id)));`,
    `const readAmount = ({ value }) => Number(value);

const sumAmounts = (fields) => fields.reduce((total, field) => total + readAmount(field), 0);

function withTip(fields, percent) {
  return Math.round(sumAmounts(fields) * (1 + percent / 100) * 100) / 100;
}`,
  ],
};

const TRACING_HIDDEN: Hidden = [
  [['weeklyTotals([1, 1, 1, 1, 1, 1, 1, 1])', [7, 1]], ['weeklyTotals([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3])', [7, 14, 21]], ['weeklyTotals([0, 0, 0, 0, 0, 0, 0, 5])', [0, 5]]],
  [['makeReminders(["x", "y"]).reverse().map((remind) => remind())', ['2. y owes you', '1. x owes you']], ['(() => { const reminders = makeReminders(["p", "q"]); reminders[1](); return reminders[0](); })()', '1. p owes you']],
  [['(() => { const expenses = [{ label: "x", amount: 2 }, { label: "y", amount: 9 }]; const top = largestExpenses(expenses, 2); return [top.map((e) => e.label), expenses.map((e) => e.label)]; })()', [['y', 'x'], ['x', 'y']]], ['(() => { const expenses = [{ label: "x", amount: 2 }]; return largestExpenses(expenses, 1) !== expenses; })()', true]],
  [
    ['(async () => { let running = 0; let most = 0; const fetchReceipt = (id) => { running += 1; most = Math.max(most, running); return new Promise((done) => setTimeout(() => { running -= 1; done({ id }); }, 5)); }; await loadReceipts([1, 2, 3, 4], fetchReceipt); return most; })()', 4],
    ['(async () => loadReceipts([5], (id) => Promise.resolve({ id, amount: 2 })))()', [{ id: 5, amount: 2 }]],
  ],
  [['withTip([{ label: "a", value: "10" }], 0)', 10], ['Number.isNaN(withTip([{ label: "a", value: "1.10" }, { label: "b", value: "2.20" }], 5))', false], ['readAmount({ label: "a", value: "" })', 0]],
];

/* ── Edges and inputs ─────────────────────────────────────────────────── */

const EDGES: Boards = {
  reference: [
    `function orderTotal(orders) {
  // orders: [{ id, amount }]
  // console.log({ sum, order }) in the callback showed sum as the first
  // order object: without a start value, reduce starts from the first
  // element, and with no orders it has nothing to start from and throws.
  return orders.reduce((sum, order) => sum + order.amount, 0);
}`,
    `function profileLine(user) {
  // console.log({ address: user.address, credits: user.credits }) showed an
  // address that was missing and credits of 0. ?. stops at a missing
  // address; ?? replaces only null and undefined, so 0 stays 0.
  const name = user.name ?? "Guest";
  const city = user.address?.city ?? "no city";
  const credits = user.credits ?? "unknown";
  return \`\${name} · \${city} · \${credits} credits\`;
}`,
    `function stockStatus(text) {
  // text: what the stock field holds, or undefined when the form has none.
  // console.log({ text, loose: text == 0 }) printed loose: true for "" and
  // for spaces: == turns blank text into 0 before it compares. Decide
  // "missing" on the text first, then compare numbers with ===.
  if (text === undefined || text.trim() === "") return "missing";
  return Number(text) === 0 ? "sold out" : "in stock";
}`,
    `function splitBill(prices, people) {
  // prices in euros
  // console.log({ total }) printed 0.30000000000000004 for 0.1 + 0.2:
  // floats cannot hold most cent amounts exactly. Count whole cents, split
  // those, and turn cents back into euros only for the answer.
  let cents = 0;
  for (const price of prices) cents += Math.round(price * 100);
  const base = Math.floor(cents / people);
  const leftover = cents % people;
  return Array.from({ length: people }, (_, index) => (base + (index < leftover ? 1 : 0)) / 100);
}`,
    `function ordersPerDay(timestamps) {
  // console.log({ stamp, utc: new Date(stamp).toISOString() }) showed the
  // two disagree near midnight: the first ten characters are the day where
  // the order was placed. A Date is one instant; take the day from its UTC
  // form, and make text only at the end.
  const counts = {};
  for (const stamp of timestamps) {
    const day = new Date(stamp).toISOString().slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}`,
  ],
  junior: [
    `function orderTotal(orders) {
  let total = 0;
  for (let i = 0; i < orders.length; i++) {
    total = total + orders[i].amount;
  }
  return total;
}`,
    `function profileLine(user) {
  let name = "Guest";
  if (user.name !== undefined && user.name !== null) {
    name = user.name;
  }
  let city = "no city";
  if (user.address !== undefined && user.address !== null) {
    if (user.address.city !== undefined && user.address.city !== null) {
      city = user.address.city;
    }
  }
  let credits = "unknown";
  if (user.credits !== undefined && user.credits !== null) {
    credits = user.credits;
  }
  return name + " · " + city + " · " + credits + " credits";
}`,
    `function stockStatus(text) {
  if (text === undefined) {
    return "missing";
  }
  const trimmed = text.trim();
  if (trimmed === "") {
    return "missing";
  }
  const amount = Number(trimmed);
  if (amount === 0) {
    return "sold out";
  }
  return "in stock";
}`,
    `function splitBill(prices, people) {
  let cents = 0;
  for (let i = 0; i < prices.length; i++) {
    cents = cents + Math.round(prices[i] * 100);
  }
  const base = Math.floor(cents / people);
  let leftover = cents - base * people;
  const shares = [];
  for (let i = 0; i < people; i++) {
    let share = base;
    if (leftover > 0) {
      share = share + 1;
      leftover = leftover - 1;
    }
    shares.push(share / 100);
  }
  return shares;
}`,
    `function ordersPerDay(timestamps) {
  const counts = {};
  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i]);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const key = year + "-" + month + "-" + day;
    if (counts[key] === undefined) {
      counts[key] = 0;
    }
    counts[key] = counts[key] + 1;
  }
  return counts;
}`,
  ],
  senior: [
    `const orderTotal = (orders) => orders.reduce((sum, { amount }) => sum + amount, 0);`,
    `function profileLine({ name, address, credits }) {
  return \`\${name ?? "Guest"} · \${address?.city ?? "no city"} · \${credits ?? "unknown"} credits\`;
}`,
    `function stockStatus(text) {
  const trimmed = text?.trim() ?? "";
  if (trimmed === "") return "missing";
  return Number(trimmed) === 0 ? "sold out" : "in stock";
}`,
    `const toCents = (euros) => Math.round(euros * 100);

function splitBill(prices, people) {
  const cents = prices.reduce((sum, price) => sum + toCents(price), 0);
  const base = Math.floor(cents / people);
  return Array.from({ length: people }, (_, index) => (base + (index < cents % people ? 1 : 0)) / 100);
}`,
    `const utcDay = (stamp) => new Date(stamp).toISOString().slice(0, 10);

function ordersPerDay(timestamps) {
  const counts = {};
  for (const day of timestamps.map(utcDay)) counts[day] = (counts[day] ?? 0) + 1;
  return counts;
}`,
  ],
};

const EDGES_HIDDEN: Hidden = [
  [['orderTotal([{ id: 9, amount: 0 }])', 0], ['orderTotal([{ id: 1, amount: -2 }, { id: 2, amount: 5 }])', 3]],
  [['profileLine({ name: "Fay", address: { city: "Rome" } })', 'Fay · Rome · unknown credits'], ['profileLine({ credits: 0 })', 'Guest · no city · 0 credits']],
  [['stockStatus("0.0")', 'sold out'], ['stockStatus("3")', 'in stock'], ['[stockStatus("00"), stockStatus("\\t")]', ['sold out', 'missing']]],
  [['splitBill([19.99, 5.01, 0.1], 3)', [8.37, 8.37, 8.36]], ['splitBill([0.07], 1)', [0.07]]],
  [['ordersPerDay(["2026-05-02T01:00:00+02:00", "2026-05-01T08:00:00Z"])', { '2026-05-01': 2 }], ['ordersPerDay(["2026-06-15T12:00:00+05:30"])', { '2026-06-15': 1 }]],
];

export const DEBUGGING_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...repairLevels('js-path-logging', LOGGING_STARTER, LOGGING, LOGGING_HIDDEN),
  ...repairLevels('js-path-tracing', TRACING_STARTER, TRACING, TRACING_HIDDEN),
  ...repairLevels('js-path-edges', EDGES_STARTER, EDGES, EDGES_HIDDEN),
]);
