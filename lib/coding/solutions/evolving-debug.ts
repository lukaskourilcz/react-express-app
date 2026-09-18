/** Server-only solutions for the debugging path (`js-evolving-debug`).
 *
 * Each stage's module fixes exactly what that stage asked for and leaves the
 * later parts as the starter has them, so a revealed solution never hands
 * over a later stage's answer. The junior and senior versions are two other
 * ways to write the same fixes — one explicit and step by step, one idiomatic
 * — and the content contract proves all three against every stage's visible
 * and hidden checks. */

import type { CodingSolution } from '../types';
import { DEBUG_CHALLENGE_ID } from '../tasks/evolving-debug';

const STARTER_SUMMARIZE = `function summarize(lines) {
  const totals = {};
  let running = 0;
  for (const line of lines) {
    const order = parseOrder(line);
    running += orderTotal(order);
    totals[order.item] = running;
  }
  return totals;
}`;
const STARTER_DISCOUNT = `function applyDiscount(total, threshold, percent) {
  if (total > threshold) {
    return total - total * percent;
  }
  return total;
}`;
const STARTER_TRACE = `function trace(label, value) {
  console.log(label, value);
}`;
const STARTER_REPORT = `function report(lines, threshold, percent) {
  // Summarize, then discount each item's total.
  return [];
}`;

/** The reference: the smallest change that makes each stage right. */
function reference(stage: number): string {
  return [
    `function parseOrder(line) {
  const [item, quantity, unitPrice] = line.split(",").map((part) => part.trim());
  return { item, quantity: Number(quantity), unitPrice: Number(unitPrice) };
}`,
    `function orderTotal(order) {
  return order.quantity * order.unitPrice;
}`,
    stage >= 2 ? `function summarize(lines) {
  const totals = {};
  for (const line of lines) {
    const order = parseOrder(line);
    totals[order.item] = (totals[order.item] ?? 0) + orderTotal(order);
  }
  return totals;
}` : STARTER_SUMMARIZE,
    stage >= 3 ? `function applyDiscount(total, threshold, percent) {
  if (total >= threshold) {
    return Math.round((total - total * (percent / 100)) * 100) / 100;
  }
  return total;
}` : STARTER_DISCOUNT,
    stage >= 4 ? `function trace(label, value) {
  console.log(label, value);
  return value;
}` : STARTER_TRACE,
    stage >= 4 ? `function report(lines, threshold, percent) {
  const totals = summarize(lines);
  return Object.keys(totals).sort().map((item) => ({
    item,
    total: totals[item],
    discounted: applyDiscount(totals[item], threshold, percent),
  }));
}` : STARTER_REPORT,
    ...(stage >= 5 ? [`function safeReport(lines, threshold, percent) {
  const good = [];
  const problems = [];
  const finite = (field) => field.trim() !== "" && Number.isFinite(Number(field));
  for (const line of lines) {
    const fields = line.split(",");
    if (line.trim() === "") problems.push({ line, reason: "empty" });
    else if (fields.length !== 3) problems.push({ line, reason: "fields" });
    else if (!finite(fields[1]) || !finite(fields[2])) problems.push({ line, reason: "number" });
    else good.push(line);
  }
  return { rows: report(good, threshold, percent), problems };
}`] : []),
  ].join('\n\n');
}

/** Junior: every step named, every branch written out, nothing chained. */
function junior(stage: number): string {
  return [
    `function parseOrder(line) {
  const parts = line.split(",");
  const item = parts[0].trim();
  const quantity = Number(parts[1].trim());
  const unitPrice = Number(parts[2].trim());
  return { item: item, quantity: quantity, unitPrice: unitPrice };
}`,
    `function orderTotal(order) {
  return order.quantity * order.unitPrice;
}`,
    stage >= 2 ? `function summarize(lines) {
  const totals = {};
  for (let i = 0; i < lines.length; i++) {
    const order = parseOrder(lines[i]);
    const total = orderTotal(order);
    if (totals[order.item] === undefined) {
      totals[order.item] = total;
    } else {
      totals[order.item] = totals[order.item] + total;
    }
  }
  return totals;
}` : STARTER_SUMMARIZE,
    stage >= 3 ? `function applyDiscount(total, threshold, percent) {
  if (total >= threshold) {
    const fraction = percent / 100;
    const discount = total * fraction;
    const discounted = total - discount;
    const rounded = Math.round(discounted * 100) / 100;
    return rounded;
  }
  return total;
}` : STARTER_DISCOUNT,
    stage >= 4 ? `function trace(label, value) {
  console.log(label, value);
  return value;
}` : STARTER_TRACE,
    stage >= 4 ? `function report(lines, threshold, percent) {
  const totals = summarize(lines);
  const items = Object.keys(totals);
  items.sort();
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const total = totals[item];
    const discounted = applyDiscount(total, threshold, percent);
    rows.push({ item: item, total: total, discounted: discounted });
  }
  return rows;
}` : STARTER_REPORT,
    ...(stage >= 5 ? [`function safeReport(lines, threshold, percent) {
  const good = [];
  const problems = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      problems.push({ line: line, reason: "empty" });
      continue;
    }
    const fields = line.split(",");
    if (fields.length !== 3) {
      problems.push({ line: line, reason: "fields" });
      continue;
    }
    const quantityText = fields[1].trim();
    const unitPriceText = fields[2].trim();
    const quantityOk = quantityText !== "" && Number.isFinite(Number(quantityText));
    const unitPriceOk = unitPriceText !== "" && Number.isFinite(Number(unitPriceText));
    if (!quantityOk || !unitPriceOk) {
      problems.push({ line: line, reason: "number" });
      continue;
    }
    good.push(line);
  }
  const rows = report(good, threshold, percent);
  return { rows: rows, problems: problems };
}`] : []),
  ].join('\n\n');
}

/** Senior: small named helpers, the built-in that fits, one decision each. */
function senior(stage: number): string {
  return [
    ...(stage >= 3 ? [`const money = (value) => Math.round(value * 100) / 100;`] : []),
    ...(stage >= 5 ? [`const asNumber = (field) => (field.trim() === "" ? NaN : Number(field));`] : []),
    `function parseOrder(line) {
  const [item, quantity, unitPrice] = line.split(",");
  return { item: item.trim(), quantity: Number(quantity), unitPrice: Number(unitPrice) };
}`,
    `const orderTotal = ({ quantity, unitPrice }) => quantity * unitPrice;`,
    stage >= 2 ? `function summarize(lines) {
  return lines.map(parseOrder).reduce((totals, order) => {
    totals[order.item] = (totals[order.item] ?? 0) + orderTotal(order);
    return totals;
  }, {});
}` : STARTER_SUMMARIZE,
    stage >= 3 ? `function applyDiscount(total, threshold, percent) {
  // Percent arrives as a whole number; the boundary is inclusive by contract.
  return total >= threshold ? money(total * (1 - percent / 100)) : total;
}` : STARTER_DISCOUNT,
    stage >= 4 ? `const trace = (label, value) => (console.log(label, value), value);` : STARTER_TRACE,
    stage >= 4 ? `function report(lines, threshold, percent) {
  const totals = summarize(lines);
  return Object.keys(totals).sort().map((item) => ({
    item,
    total: totals[item],
    discounted: applyDiscount(totals[item], threshold, percent),
  }));
}` : STARTER_REPORT,
    ...(stage >= 5 ? [`function lineProblem(line) {
  if (line.trim() === "") return "empty";
  const fields = line.split(",");
  if (fields.length !== 3) return "fields";
  return fields.slice(1).every((field) => Number.isFinite(asNumber(field))) ? null : "number";
}`, `function safeReport(lines, threshold, percent) {
  const problems = lines.flatMap((line) => {
    const reason = lineProblem(line);
    return reason ? [{ line, reason }] : [];
  });
  const good = lines.filter((line) => lineProblem(line) === null);
  return { rows: report(good, threshold, percent), problems };
}`] : []),
  ].join('\n\n');
}

/** Hidden checks per stage: the same behaviour from angles the visible ones
 * do not take. Cumulative like the visible tests. */
const HIDDEN: [string, unknown][][] = [
  [['parseOrder("espresso,10,1.1")', { item: 'espresso', quantity: 10, unitPrice: 1.1 }], ['Object.keys(parseOrder("a,1,1"))', ['item', 'quantity', 'unitPrice']]],
  [['Object.keys(summarize(["b,1,1","a,1,1"]))', ['b', 'a']], ['summarize(["x,3,0.5"]).x', 1.5]],
  [['applyDiscount(80, 40, 25)', 60], ['applyDiscount(19.99, 20, 50)', 19.99], ['applyDiscount(20, 20, 50)', 10], ['applyDiscount(0, 0, 10)', 0]],
  [['trace("n", null)', null], ['report(["b,2,1","a,1,1","b,1,1"], 3, 50)', [{ item: 'a', total: 1, discounted: 1 }, { item: 'b', total: 3, discounted: 1.5 }]]],
  [['safeReport(["a,1,"], 1, 1).problems[0].reason', 'number'], ['safeReport(["a,1,1"], 1, 1).problems', []], ['safeReport(["", "  ", "x"], 1, 1).problems.map((p) => p.reason)', ['empty', 'empty', 'fields']]],
];

export const DEBUG_EVOLVING_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries(
  [1, 2, 3, 4, 5].map((stage) => [`${DEBUG_CHALLENGE_ID}-${stage}`, {
    solution: reference(stage),
    junior: junior(stage),
    senior: senior(stage),
    hiddenTests: HIDDEN.slice(0, stage).flat().map(([call, expected]) => ({ call, expected, edge: true })),
  }]),
);
