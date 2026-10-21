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

import type { CallTest } from '../../../shared/coding-catalog';
import type { Spec } from './evolving';

export const DEBUG_CHALLENGE_ID = 'js-evolving-debug';

const check = (call: string, expected: unknown, label?: string, edge = false): CallTest => ({
  call,
  expected,
  ...(label ? { label } : {}),
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
const ref = (title: string, url: string) => ({ title, url });

export const DEBUG_EVOLVING: Record<string, Spec> = {
  [DEBUG_CHALLENGE_ID]: {
    starter: STARTER,
    focus: ['functions', 'objects', 'strings'],
    format: 'debug',
    pitfalls: ['output-shape', 'output-shape', 'boundary', 'missing-return', 'runtime'],
    prompts: [
      "Verify the setup, then write down what you assume. Press Run before you touch anything: the scratch pad already logs one parsed order, so read the Console and say what type `quantity` is. Then make `parseOrder(line)` return `{item, quantity, unitPrice}` with every field trimmed and the two numbers as numbers \u2014 `\"latte,3,4.50\"` gives `{item: \"latte\", quantity: 3, unitPrice: 4.5}`. Log `parts` after the split before you fix it, and log the result after. line remains a primitive string with exactly two ASCII commas and at most 20000 UTF-16 units. Trim the item with ECMAScript whitespace rules, preserving its interior/case/Unicode exactly, including empty or prototype-like names. Both numeric fields are nonblank after trimming and convert to finite Numbers using whole-field Number() semantics, including signs, decimal/exponent and binary/hex forms. Invalid lines are later work. This numeric conversion replaces the earlier checkpoint's raw-string numeric fields. Return a fresh mutable ordinary {item,quantity,unitPrice} record in that field order. Equivalent zero signs are accepted. Target: O(n) time and O(n) extra space for parseOrder, n=1+raw line length.",
      "Trace it by hand before you trust it. `summarize(lines)` should map each item to the sum of its order totals: `[\"latte,1,4\", \"tea,2,1\", \"latte,1,4\"]` gives `{latte: 8, tea: 2}`. On paper, walk that input through the loop and write down `order`, `running` and `totals` after every line. Then log the same three values inside the loop and compare. Ask the question out loud: is `running` tracked per item, or across all items? `orderTotal` is fine \u2014 prove it to yourself with one log before you move on. Repeated items now add in input order; begin a new item at 0 and add every order product, keeping groups whose final sum is 0. Keep the earlier valid parsing/Number rules. lines is a dense readonly array of at most 2000 strings with at most 20000 total UTF-16 units, possibly frozen. orderTotal multiplies quantity*unitPrice with ordinary Number arithmetic; products and running item totals are finite by input guarantee. Do not round totals. Match trimmed item names exactly, without Unicode normalization. The result is a fresh mutable record, ordinary or null-prototype, whose own enumerable data entries include every item even when its total is 0. Built-in/prototype names such as __proto__, constructor and toString are ordinary item keys; inherited values never supply a prior total. Own-key order follows JavaScript numeric-index/creation order. Do not mutate inputs or share output state across calls. Let n=1+line count+total UTF-16 units. Target: O(n) time and O(n) extra space for summarize.",
      "Validate the logic at its edges. `applyDiscount(total, threshold, percent)` should take `percent` off (a whole number: `10` means ten percent) when `total` is at or above `threshold`, rounded to two decimals, and return `total` unchanged below it: `applyDiscount(50, 50, 10)` is `45`, `applyDiscount(49.99, 50, 10)` is `49.99`. Two things are wrong. Log the inputs and the result for a total exactly at the threshold, then for one a cent below it, then log `total * percent` on its own. total and threshold are finite Numbers from 0 through 1e9 (fractional values allowed); percent is an integer from 0 through 100. Use ordinary Number operations in this order: removed=total*(percent/100), discounted=total-removed. Equivalent zero signs are accepted. Target: O(1) time and O(1) extra space per applyDiscount; earlier helpers retain their own input-size targets. When total >= threshold return Math.round(discounted*100)/100; when total < threshold return the original total without rounding, even if it has more than two decimals. Keep the stated subtraction order: mathematically equivalent multiplication can round differently at binary half-cent boundaries.",
      "Now write code \u2014 in pieces, with a log between them. First, `trace(label, value)` is meant to be a pass-through: log the label and the value, then return the value unchanged, so it can sit inside any expression. Right now it swallows the value. Then write `report(lines, threshold, percent)`: summarize the lines and, for each item sorted by name, return `{item, total, discounted}` where `discounted` is `applyDiscount(total, threshold, percent)`. Get the totals right and logged before you write the rows. Keep the previous trace argument/identity rules; its O(1) target excludes console formatting. Keep the earlier valid parsing/exact item names, safe own totals and Number arithmetic. lines is a dense readonly array of at most 2000 primitive strings with at most 20000 total UTF-16 units. Per-item totals passed to applyDiscount are in its earlier 0..1e9 domain by input guarantee; do not add new sign checks to numeric fields themselves. threshold/percent keep the earlier domain. Return one fresh mutable {item,total,discounted} row per exact item, including zero totals, in a fresh mutable array. Sort names by literal UTF-16 code-unit order, like default Array.sort; do not lowercase, normalize or use language collation. Keep input arrays unchanged and results independent across calls. Let n=1+line count+total UTF-16units, u=1+distinct item count and w=1+maximum item-name length. Target: O(n+u*w*log(u)) time and O(n+u*w) extra space, using ordinary comparison sorting with O(w) string comparisons.",
      "Stay calm with the bug you did not plant. Real data has bad lines. Add `safeReport(lines, threshold, percent)` that checks each line in this order \u2014 trimmed empty is `\"empty\"`, not exactly three comma-separated fields is `\"fields\"`, a blank or non-finite quantity or unitPrice is `\"number\"` \u2014 collects `{line, reason}` in input order, runs `report` on the good lines only, and returns `{rows, problems}`. When your first attempt throws, that is not an emergency: read the message, log the line that caused it, and handle that one case. lines is a dense readonly array of at most 2000 primitive strings and at most 20000 total UTF-16 units, possibly frozen. Use ECMAScript trim for emptiness, exactly two ASCII commas for three fields, and whole-field Number() for both numeric strings after rejecting blank fields. Finite signed/exponent/prefixed values are valid; do not use prefix parsing or reject negative fields by themselves. Item names may be empty. Each good-line group total is in report's earlier 0..1e9 domain by input guarantee. Preserve each exact raw line in problems, including duplicate bad-line occurrences; never trim or deduplicate that list. Each returned outer record, rows/problems array, row and problem record is fresh and mutable, independent across calls. Keep earlier report sorting/Number/ownership and threshold/percent rules. Let n count all raw lines+UTF16units+1; u/w describe the retained good-line item set as before. Target: O(n+u*w*log(u)) time and O(n+u*w) extra space. Only the stated empty/fields/number reasons exist, with that precedence.",
    ],
    hints: [
      "Log the split fields and their types. Convert each complete numeric field with Number(), preserving exact trimmed item names and fresh records.",
      "Trace per-item totals in input order. Store safe own entries even for __proto__/constructor, and keep every item including zero totals.",
      "Log both sides of the threshold. Subtract total*(percent/100) before rounding that branch; leave the below-threshold total unchanged.",
      "Keep the exact trace value/arguments, then build fresh report rows from safe totals in literal UTF-16 item-name order, without changing inputs.",
      "Log the exact failing raw line. Check empty, then field count, then whole-field finite numbers; keep each bad-line occurrence in order and return fresh mutable output.",
    ],
    approaches: [
      [
        'Run it as it is. The scratch pad already logs one order; read the Console before you read the code.',
        'Log `parts` after the split. Every field is text, and two of them are meant to be numbers.',
        "Trim the item and convert both complete numeric fields with Number(), including exponent/prefixed forms. Log the record and types once more.",
      ],
      [
        'Trace ["latte,1,4", "tea,2,1", "latte,1,4"] on paper: after each line, write down order, running and totals.',
        'Log the same three values inside the loop and compare with your trace. Where they differ is where the bug is.',
        "Use safe own data entries for every exact item name. Start a new item at 0, add each product in input order and retain zero totals.",
      ],
      [
        'Test the boundary first: what should a total exactly at the threshold get? Log what it gets.',
        '10 means ten percent, so the fraction is percent / 100. Log the discount amount alone and check it against arithmetic you did in your head.',
        "Compute removed=total*(percent/100), then discounted=total-removed. Round only that discounted branch with Math.round(discounted*100)/100.",
      ],
      [
        'Fix trace first: log the label and the value, then return the value. Prove it with trace("x", 5) in the scratch pad.',
        'In report, get the totals from summarize and log them. Do not write the next step until that log looks right.',
        "Sort exact item names in default UTF-16 order, then build fresh {item,total,discounted} rows using applyDiscount, including zero totals.",
      ],
      [
        'Run report on the messy example and let it throw. The error message tells you which line to look at; log that line.',
        'Validate each line in order: trimmed empty is "empty"; not exactly three comma-separated fields is "fields"; a blank or non-finite quantity or unitPrice is "number".',
        "Keep every raw bad-line occurrence in input order, pass only good lines to report and return fresh mutable {rows,problems} arrays/records.",
      ],
    ],
    tests: [
      [
        check("parseOrder(\"a,0x10,0b10\")", {"item": "a", "quantity": 16, "unitPrice": 2}),
        check('parseOrder("latte,3,4.50")', { item: 'latte', quantity: 3, unitPrice: 4.5 }),
        check('typeof parseOrder("tea,2,1").quantity', 'number', 'quantity is a number, not the text "2"'),
        check('parseOrder(" tea , 2 , 1.25 ")', { item: 'tea', quantity: 2, unitPrice: 1.25 }, 'spaces around every field are trimmed'),
        check('parseOrder("flat white,1,3")', { item: 'flat white', quantity: 1, unitPrice: 3 }, 'a space inside the name stays'),
        check('parseOrder("cake,0,2.5").quantity', 0, 'zero is a quantity', true),
      ],
      [
        check("(()=>{const out=summarize(['zero,0,2']);return Object.hasOwn(out,'zero')&&out.zero===0;})()", true),
        check('summarize(["latte,1,4","tea,2,1","latte,1,4"])', { latte: 8, tea: 2 }, 'each item keeps its own total'),
        check('summarize(["a,1,1","b,1,1","a,1,1","b,1,1"])', { a: 2, b: 2 }),
        check('summarize(["tea,2,1.5"])', { tea: 3 }),
        check('summarize(["cake,0,2.5","cake,1,2.5"])', { cake: 2.5 }),
        check('summarize([])', {}, 'no lines, no totals', true),
      ],
      [
        check("applyDiscount(19.999,20,50)", 19.999),
        check('applyDiscount(50, 50, 10)', 45, 'exactly at the threshold counts', true),
        check('applyDiscount(49.99, 50, 10)', 49.99, 'a cent below it does not', true),
        check('applyDiscount(100, 50, 10)', 90),
        check('applyDiscount(33.33, 10, 10)', 30, 'rounded to two decimals'),
        check('applyDiscount(10, 10, 0)', 10),
      ],
      [
        check("report(['a,1,1','A,1,1'],10,50).map(row=>row.item)", ["A", "a"]),
        check('trace("order", {item: "tea"})', { item: 'tea' }, 'trace hands the value back'),
        check('report(["latte,2,4","tea,1,1"], 5, 10)', [{ item: 'latte', total: 8, discounted: 7.2 }, { item: 'tea', total: 1, discounted: 1 }]),
        check('report(["b,1,1","a,1,1"], 100, 50).map(row => row.item)', ['a', 'b'], 'rows are sorted by item'),
        check('report(["latte,1,4","latte,1,4"], 8, 25)', [{ item: 'latte', total: 8, discounted: 6 }]),
        check('report([], 1, 1)', [], 'no lines, no rows', true),
      ],
      [
        check("safeReport(['bad','bad','a,1,2'],1,50).problems", [{"line": "bad", "reason": "fields"}, {"line": "bad", "reason": "fields"}]),
        check('safeReport(["latte,1,4","","tea,x,1","cake,1"], 100, 10)', { rows: [{ item: 'latte', total: 4, discounted: 4 }], problems: [{ line: '', reason: 'empty' }, { line: 'tea,x,1', reason: 'number' }, { line: 'cake,1', reason: 'fields' }] }, 'bad lines are reported, good lines are still counted'),
        check('safeReport(["   "], 1, 1).problems', [{ line: '   ', reason: 'empty' }], 'whitespace only is empty'),
        check('safeReport(["a,1,1,1"], 1, 1).problems[0].reason', 'fields'),
        check('safeReport(["a,1,Infinity"], 1, 1).problems[0].reason', 'number', 'Infinity is not a price', true),
        check('safeReport(["a,two,1","b,1,1"], 100, 10).rows', [{ item: 'b', total: 1, discounted: 1 }]),
      ],
    ],
    references: [
      // The hint ladder ends on the first reference, so it is the MDN page
      // for the stage's instrument, as on every other stage.
      [ref('console.log()', mdn + 'API/console/log_static')],
      [ref('console.table() for tracing a loop', mdn + 'API/console/table_static')],
      [ref('Math.round()', mdn + 'JavaScript/Reference/Global_Objects/Math/round')],
      [ref('The return statement', mdn + 'JavaScript/Reference/Statements/return')],
      [ref('Number.isFinite()', mdn + 'JavaScript/Reference/Global_Objects/Number/isFinite')],
    ],
  },
};

/** The checkpoint before each milestone: the same method step, on the
 * smallest piece that shows it. Each one fails on the untouched starter. */
export interface DebugCheckpoint { prompt: string; tests: CallTest[] }
export const DEBUG_CHECKPOINTS: Record<string, DebugCheckpoint[]> = {
  [DEBUG_CHALLENGE_ID]: [
    {
      prompt: "Verify the setup first. Press Run and read the Console: the scratch pad logs one parsed order. Then make the smallest change so that `parseOrder` trims the spaces around the item name \u2014 nothing else yet. Implement parseOrder(line) returning {item,quantity,unitPrice}. line is a primitive string with exactly two ASCII commas and at most 20000 UTF-16 units. Only item is trimmed using ECMAScript whitespace/line-terminator rules; preserve its interior characters/case/Unicode exactly. quantity and unitPrice remain their original untrimmed string fields, including empty or whitespace fields; do not convert numbers yet. Return a fresh mutable ordinary record with these own enumerable fields on every call. Other functions are later work. Target: O(n) time and O(n) extra space, where n=1+the raw line length.",
      tests: [
        check("parseOrder('\\u2003latte\\ufeff,3,4.50').item","latte"),
        check('parseOrder(" latte ,3,4.50").item', 'latte'),
        check('parseOrder("tea,2,1").item', 'tea'),
        check('parseOrder(" flat white ,1,3").item', 'flat white', 'only the outer spaces go', true),
        check('parseOrder("cake ,0,2.5").item', 'cake'),
      ],
    },
    {
      prompt: "Trace it by hand. For `[\"latte,1,4\", \"tea,2,1\"]`, write down `order`, `running` and `totals` after each line, then log them and compare. Make `summarize` right for lines whose items are all different. Items at this checkpoint are distinct after trimming; repeated-item accumulation comes next. Keep the earlier valid parsing/Number rules. lines is a dense readonly array of at most 2000 strings with at most 20000 total UTF-16 units, possibly frozen. orderTotal multiplies quantity*unitPrice with ordinary Number arithmetic; products and running item totals are finite by input guarantee. Do not round totals. Match trimmed item names exactly, without Unicode normalization. The result is a fresh mutable record, ordinary or null-prototype, whose own enumerable data entries include every item even when its total is 0. Built-in/prototype names such as __proto__, constructor and toString are ordinary item keys; inherited values never supply a prior total. Own-key order follows JavaScript numeric-index/creation order. Do not mutate inputs or share output state across calls. Let n=1+line count+total UTF-16 units. Target: O(n) time and O(n) extra space for summarize.",
      tests: [
        check("(()=>{const out=summarize(['__proto__,1,2']);return Object.hasOwn(out,'__proto__')&&out.__proto__===2;})()", true),
        check('summarize(["latte,1,4","tea,2,1"])', { latte: 4, tea: 2 }, 'the second item does not inherit the first total'),
        check('summarize(["a,2,3"])', { a: 6 }),
        check('summarize([])', {}, undefined, true),
      ],
    },
    {
      prompt: "`percent` is a whole number: `10` means ten percent. Log `total * percent` for `applyDiscount(100, 50, 10)`, see why the result is absurd, and fix the arithmetic. Leave the threshold comparison for the next step. total and threshold are finite Numbers from 0 through 1e9 (fractional values allowed); percent is an integer from 0 through 100. Use ordinary Number operations in this order: removed=total*(percent/100), discounted=total-removed. Equivalent zero signs are accepted. Target: O(1) time and O(1) extra space per applyDiscount; earlier helpers retain their own input-size targets. At this checkpoint discount only when total > threshold and return discounted without rounding. Leave totals at/below the threshold unchanged; inclusive comparison and cent rounding come next.",
      tests: [
        check("applyDiscount(7.5,5,20)", 6),
        check('applyDiscount(100, 50, 10)', 90, 'ten percent off, not ten times'),
        check('applyDiscount(200, 50, 50)', 100),
        check('applyDiscount(20, 50, 10)', 20, 'below the threshold nothing changes', true),
      ],
    },
    {
      prompt: "A pass-through logs and then returns. Make `trace(label, value)` return `value` unchanged, and prove it with `trace(\"x\", 5)` in the scratch pad before you go on. label and value may be any opaque JavaScript values, including undefined, symbols, functions or cyclic/getter objects. Call console.log exactly once synchronously with exactly [label,value] as its two arguments, without cloning, coercing or inspecting either, then return the exact value. Ignore the logger return value. The test logger does not throw; no console-replacement/binding behavior beyond those arguments is required. Target: O(1) time and O(1) extra space per trace, excluding the console provider's formatting/transport work. Use Run to verify the console emission; automated Submit assertions check the returned value and its identity.",
      tests: [
        check("(()=>{const value=[];return trace('x',value)===value;})()", true),
        check('trace("x", 5)', 5, 'the value comes back'),
        check('trace("list", [1, 2])', [1, 2]),
        check('(() => { const seen = trace("seen", "ok"); return seen; })()', 'ok', 'so it can sit inside an expression', true),
      ],
    },
    {
      prompt: "Add `safeReport(lines, threshold, percent)` for input that is all good: return `{rows, problems}` where `rows` is `report(lines, threshold, percent)` and `problems` is an empty array. The bad lines come next. Keep report's earlier valid-input, exact sorting, readonly/fresh-output and n/u/w rules. The outer {rows,problems} record and empty problems array must also be fresh and mutable on every call. Target: O(n+u*w*log(u)) time and O(n+u*w) extra space. Do not freeze or reuse the result; validation is introduced next.",
      tests: [
        check("safeReport(['a,0,1'],1,50)", {"rows": [{"item": "a", "total": 0, "discounted": 0}], "problems": []}),
        check('safeReport(["a,2,2"], 4, 50)', { rows: [{ item: 'a', total: 4, discounted: 2 }], problems: [] }),
        check('safeReport([], 1, 1)', { rows: [], problems: [] }, 'nothing in, nothing wrong', true),
      ],
    },
  ],
};
