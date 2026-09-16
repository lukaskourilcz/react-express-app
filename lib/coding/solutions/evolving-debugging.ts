/** Reference repairs for the debugging course. Server-only.
 *
 * Each repair is the smallest change that fixes the stated behaviour, with
 * every debugging line removed again: the course teaches adding a log to
 * find a bug and taking it out afterwards, and the reference should look like
 * the code a learner ships, not the code they debugged with. The last stage
 * is graded on an empty console, so its repair prints nothing by contract.
 * Hidden tests check the same behaviour from angles the visible ones do not. */

import type { CodingSolution } from '../types';
import { DEBUGGING_COURSE_ID } from '../../../shared/evolving';

const REPAIRS: CodingSolution[] = [
  {
    solution: `function orderTotal(order) {
  return order.items
    .map((item) => item.price * item.qty)
    .reduce((sum, value) => sum + value, 0);
}`,
    hiddenTests: [
      { call: 'orderTotal({ items: [{ price: 1, qty: 0 }] })', expected: 0 },
      { call: 'orderTotal({ items: [{ price: 0, qty: 9 }, { price: 3, qty: 1 }] })', expected: 3 },
    ],
  },
  {
    solution: `function addToCart(cart, sku, raw) {
  const qty = Number(raw.trim());
  const line = cart.find((item) => item.sku === sku);
  if (line) line.qty = line.qty + qty;
  else cart.push({ sku, qty });
  return cart;
}`,
    hiddenTests: [
      { call: "typeof addToCart([], 'x', '3')[0].qty", expected: 'number', label: 'the stored quantity is a number' },
      { call: "addToCart([{ sku: 'a', qty: 5 }], 'a', '10')", expected: [{ sku: 'a', qty: 15 }] },
    ],
  },
  {
    solution: `function priceRange(prices) {
  if (prices.length === 0) return null;
  let min = prices[0];
  let max = prices[0];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < min) min = prices[i];
    if (prices[i] > max) max = prices[i];
  }
  return { min, max };
}`,
    hiddenTests: [
      { call: 'priceRange([7])', expected: { min: 7, max: 7 } },
      { call: 'priceRange([10, 1])', expected: { min: 1, max: 10 } },
    ],
  },
  {
    solution: `function applyDiscount(price, percent) {
  return price - (price * percent) / 100;
}

function discountedTotal(items, percent) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return applyDiscount(total, percent);
}`,
    hiddenTests: [
      { call: 'discountedTotal([{ price: 100 }], 100)', expected: 0 },
      { call: 'discountedTotal([{ price: 30 }, { price: 70 }], 25)', expected: 75 },
    ],
  },
  {
    solution: `function inventoryValue(products) {
  let value = 0;
  for (const product of products) {
    value += product.price * product.stock;
  }
  return value;
}`,
    hiddenTests: [
      { call: "Number.isNaN(inventoryValue([{ sku: 'q', price: 1, stock: 1 }]))", expected: false, label: 'the value is a number, not NaN' },
      { call: "inventoryValue([{ sku: 'a', price: 2.5, stock: 2 }])", expected: 5 },
    ],
  },
  {
    solution: `function restockPlan(products, minimum) {
  const skus = [];
  for (let i = 0; i < products.length; i++) {
    if (products[i].stock < minimum) skus.push(products[i].sku);
  }
  return skus;
}`,
    hiddenTests: [
      { call: "restockPlan([{ sku: 'a', stock: 5 }], 5)", expected: [], label: 'stock at the minimum is not low' },
      { call: "restockPlan([{ sku: 'a', stock: 0 }, { sku: 'b', stock: 0 }], 1)", expected: ['a', 'b'] },
    ],
  },
  {
    solution: `function runningBalance(transactions) {
  const balances = [];
  let balance = 0;
  for (const tx of transactions) {
    if (tx.type === 'refund') balance -= tx.amount;
    else balance += tx.amount;
    balances.push(balance);
  }
  return balances;
}`,
    hiddenTests: [
      { call: "runningBalance([{ type: 'sale', amount: 5 }, { type: 'sale', amount: 5 }])", expected: [5, 10] },
      { call: "runningBalance([{ type: 'sale', amount: 20 }, { type: 'refund', amount: 20 }])", expected: [20, 0] },
    ],
  },
  {
    solution: `function applyCoupon(total, coupon) {
  let result = total;
  if (coupon.kind === 'percent') result = total - (total * coupon.value) / 100;
  if (coupon.kind === 'fixed') result = Math.max(0, total - coupon.value);
  return result;
}`,
    hiddenTests: [
      { call: "applyCoupon(100, { kind: 'percent', value: 100 })", expected: 0 },
      { call: "applyCoupon(40, { kind: 'percent', value: 0 })", expected: 40 },
      { call: "applyCoupon(50, { kind: 'loyalty', value: 5 })", expected: 50, label: 'an unknown coupon changes nothing' },
    ],
  },
  {
    solution: `function formatPrice(amount) {
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
  return 'discount -' + formatPrice(discountAmount(order));
}

function totalLine(order) {
  return 'total ' + formatPrice(subtotal(order) - discountAmount(order));
}

function receipt(order) {
  return [...order.items.map(itemLine), discountLine(order), totalLine(order)];
}`,
    hiddenTests: [
      { call: "receipt({ items: [{ name: 'a', price: 10, qty: 1 }, { name: 'b', price: 10, qty: 1 }], discountPercent: 25 })", expected: ['a 10.00 CZK', 'b 10.00 CZK', 'discount -5.00 CZK', 'total 15.00 CZK'] },
    ],
  },
  {
    solution: `function topSellers(products, n) {
  const ranked = [...products].sort((a, b) => b.sold - a.sold);
  return ranked.slice(0, n);
}`,
    hiddenTests: [
      { call: "(() => { const list = [{ sku: 'a', sold: 0 }, { sku: 'b', sold: 1 }]; const out = topSellers(list, 1); return out !== list && list[0].sku === 'a'; })()", expected: true, label: 'a new array comes back and the input keeps its order' },
      { call: "topSellers([{ sku: 'a', sold: 3 }, { sku: 'b', sold: 3 }], 2)", expected: [{ sku: 'a', sold: 3 }, { sku: 'b', sold: 3 }], label: 'equal sales keep their input order' },
    ],
  },
  {
    solution: `function markPaid(order) {
  return { ...order, status: { ...order.status, paid: true } };
}`,
    hiddenTests: [
      { call: '(() => { const order = { id: 9, status: { paid: false } }; return markPaid(order).status !== order.status; })()', expected: true, label: 'the copy has its own status object' },
      { call: "(() => { const order = { id: 4, status: { paid: false }, items: ['a'] }; return markPaid(order).items; })()", expected: ['a'] },
    ],
  },
  {
    solution: `function parse(lines) {
  return lines.map((line) => {
    const [sku, price, qty] = line.split(',');
    return { sku, price: Number(price), qty: Number(qty) };
  });
}

function keep(items) {
  return items.filter((item) => item.qty > 0);
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
}`,
    hiddenTests: [
      { call: "summarize(['b,2,1', 'a,1,1', 'a,1,1'])", expected: [{ sku: 'a', total: 2 }, { sku: 'b', total: 2 }], label: 'records come back sorted by sku' },
      { call: "summarize(['x,5,0'])", expected: [] },
    ],
  },
  {
    solution: `function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}`,
    hiddenTests: [
      { call: 'mergeRanges([[5, 5], [5, 5]])', expected: [[5, 5]] },
      { call: 'mergeRanges([[2, 3], [1, 2]])', expected: [[1, 3]] },
      { call: '(() => { const input = [[3, 4], [1, 2]]; mergeRanges(input); return input; })()', expected: [[3, 4], [1, 2]], label: 'the input is not reordered' },
    ],
  },
  {
    solution: `function parseOrder(input) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}`,
    hiddenTests: [
      { call: "parseOrder('null')", expected: null },
      { call: 'parseOrder({ items: [] })', expected: { items: [] } },
      { call: "parseOrder('[1,2]')", expected: [1, 2] },
    ],
  },
  {
    solution: `function checkout(cart, coupon) {
  let total = 0;
  for (const item of cart) total += item.price * item.qty;
  if (coupon && coupon.kind === 'percent') total -= (total * coupon.value) / 100;
  if (coupon && coupon.kind === 'fixed') total -= coupon.value;
  return Math.max(0, total);
}`,
    hiddenTests: [
      { call: "checkout([{ price: 20, qty: 3 }], { kind: 'fixed', value: 10 })", expected: 50 },
      { call: "checkout([{ price: 5, qty: 1 }], { kind: 'fixed', value: 50 })", expected: 0, label: 'a coupon larger than the cart stops at zero' },
    ],
  },
];

export const DEBUGGING_COURSE_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries(
  REPAIRS.map((repair, index) => [`${DEBUGGING_COURSE_ID}-${index + 1}`, repair]),
);
