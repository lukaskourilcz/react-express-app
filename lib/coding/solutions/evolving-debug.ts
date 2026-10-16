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
  const totals = Object.create(null);
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
  const totals = Object.create(null);
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
  }, Object.create(null));
}` : STARTER_SUMMARIZE,
    stage >= 3 ? `function applyDiscount(total, threshold, percent) {
  // Percent arrives as a whole number; the boundary is inclusive by contract.
  return total >= threshold ? money(total - total * (percent / 100)) : total;
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
  [["(()=>{const numbers=[['0',0],['-0',0],['+3',3],['001.25',1.25],['1e-7',1e-7],['0x10',16],['0b101',5],['0o10',8],['-2.5',-2.5],['5e-324',Number.MIN_VALUE]],spaces=['','\\t','\\n','\\u00a0','\\ufeff','\\u2003'],items=['','\u00e9','e\\u0301','__proto__','flat white','\\u200bA\\u200b'];for(let s=0;s<spaces.length;s++)for(let i=0;i<numbers.length;i++)for(const item of items){const a=numbers[i],b=numbers[(i*3+s)%numbers.length],space=spaces[s],line=space+item+space+','+space+a[0]+space+','+space+b[0]+space,result=parseOrder(line);if(result.item!==item||typeof result.quantity!=='number'||typeof result.unitPrice!=='number'||result.quantity!==a[1]||result.unitPrice!==b[1])return false;}return true;})()",true],["(()=>{const line=' a , -0 , 0x10 ',first=parseOrder(line),second=parseOrder(line);if(first===second||Object.getPrototypeOf(first)!==Object.prototype||Object.keys(first).join(',')!=='item,quantity,unitPrice'||first.item!=='a'||first.quantity!==0||first.unitPrice!==16)return false;first.item='changed';first.quantity=99;delete first.unitPrice;first.extra=1;const third=parseOrder(line);return second.item==='a'&&third.item==='a'&&third.quantity===0&&third.unitPrice===16&&Object.keys(third).length===3;})()",true],["(()=>{const name=' x'.repeat(9998),line=name+',1,1',first=parseOrder(line);if(line.length!==20000||first.item!==name.slice(1)||first.quantity!==1||first.unitPrice!==1)return false;const raw='a,'+'0'.repeat(19995)+'1,1',second=parseOrder(raw);return raw.length===20000&&second.item==='a'&&second.quantity===1&&second.unitPrice===1;})()",true],['parseOrder("espresso,10,1.1")', { item: 'espresso', quantity: 10, unitPrice: 1.1 }], ['Object.keys(parseOrder("a,1,1"))', ['item', 'quantity', 'unitPrice']]],
  [["(()=>{const names=['__proto__','constructor','toString','hasOwnProperty','','10','2','\u00e9','e\\u0301','normal'];for(let seed=0;seed<64;seed++){const rows=[],expected=new Map();for(let i=0;i<32;i++){const item=names[(seed+i*3)%names.length],quantity=[0,0.1,2,-1,1e16][(seed+i)%5],price=[0.5,0.2,2,0][(seed*3+i)%4];rows.push(' '+item+' ,'+quantity+','+price);expected.set(item,(expected.get(item)??0)+quantity*price);}const actual=summarize(Object.freeze(rows)),wanted=['2','10',...[...expected.keys()].filter(k=>k!=='2'&&k!=='10')],keys=Object.keys(actual);if(keys.length!==expected.size||keys.some((key,i)=>key!==wanted[i]))return false;for(const[key,value]of expected){const descriptor=Object.getOwnPropertyDescriptor(actual,key);if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||descriptor.value!==value)return false;}}return true;})()",true],["(()=>{const lines=Object.freeze(['__proto__,1,2','constructor,1,3','\u00e9,0,4']),first=summarize(lines),second=summarize(lines);if(first===second||!Object.hasOwn(first,'__proto__')||first.__proto__!==2||first.constructor!==3||!Object.hasOwn(first,'\u00e9')||first['\u00e9']!==0)return false;first.constructor=9;delete first.__proto__;first.extra=1;const third=summarize(lines),empty=summarize([]),again=summarize([]);empty.mutable=1;return second.constructor===3&&third.__proto__===2&&third.constructor===3&&Object.keys(again).length===0&&lines.length===3;})()",true],["(()=>{const repeated=Object.freeze(Array.from({length:2000},()=> 'a,1,0.5')),out=summarize(repeated);if(Object.keys(out).length!==1||out.a!==1000)return false;const unique=[];for(let i=0;i<2000;i++)unique.push(i.toString(36)+',1,1');const many=summarize(Object.freeze(unique));if(Object.keys(many).length!==2000)return false;for(let i=0;i<2000;i++)if(many[i.toString(36)]!==1)return false;const name='x'.repeat(19996),line=name+',1,1',long=summarize([line]);return line.length===20000&&Object.hasOwn(long,name)&&long[name]===1;})()",true],['Object.keys(summarize(["b,1,1","a,1,1"]))', ['b', 'a']], ['summarize(["x,3,0.5"]).x', 1.5]],
  [["(()=>{const totals=[0,0.005,0.05,0.1,0.18,0.35,1,7.5,19.999,33.33,1000000000],percentages=[0,1,10,30,65,75,99,100];for(const total of totals)for(const percent of percentages)for(const threshold of[0,total,Math.min(1e9,total+0.001)]){const removed=total*(percent/100),discounted=total-removed,expected=total>=threshold?Math.round(discounted*100)/100:total,actual=applyDiscount(total,threshold,percent);if(typeof actual!=='number'||actual!==expected)return false;}return true;})()",true],["(()=>{return applyDiscount(0.05,0,30)===0.04&&applyDiscount(0.1,0,75)===0.02&&applyDiscount(19.999,20,50)===19.999&&applyDiscount(50,50,10)===45&&applyDiscount(1e9,0,100)===0&&applyDiscount(0,0,100)===0;})()",true],["(()=>{for(let i=0;i<10000;i++){const total=(i%100)/100+1e-7,threshold=(i%3)*0.25,percent=i%101,removed=total*(percent/100),discounted=total-removed,expected=total>=threshold?Math.round(discounted*100)/100:total;if(applyDiscount(total,threshold,percent)!==expected)return false;}return true;})()",true],['applyDiscount(80, 40, 25)', 60], ['applyDiscount(19.99, 20, 50)', 19.99], ['applyDiscount(20, 20, 50)', 10], ['applyDiscount(0, 0, 10)', 0]],
  [['trace("n", null)', null], ['report(["b,2,1","a,1,1","b,1,1"], 3, 50)', [{ item: 'a', total: 1, discounted: 1 }, { item: 'b', total: 3, discounted: 1.5 }]]],
  [['safeReport(["a,1,"], 1, 1).problems[0].reason', 'number'], ['safeReport(["a,1,1"], 1, 1).problems', []], ['safeReport(["", "  ", "x"], 1, 1).problems.map((p) => p.reason)', ['empty', 'empty', 'fields']]],
];

/** A checkpoint's reference (`…-N-start`): the previous stage's module with
 * the one change the checkpoint asks for, which leaves the rest of stage N to
 * do, so it never passes stage N. A checkpoint shows no junior or senior
 * board. Each entry swaps one function of the previous module for its
 * checkpoint version; the last adds one. */
const CHECKPOINT_CHANGES: [before: string, after: string][] = [
  [reference(0).split('\n\n')[0], `function parseOrder(line) {
  const parts = line.split(",");
  // Only the item name is trimmed at this step; the numbers come next.
  return { item: parts[0].trim(), quantity: parts[1], unitPrice: parts[2] };
}`],
  [STARTER_SUMMARIZE, `function summarize(lines) {
  const totals = Object.create(null);
  for (const line of lines) {
    const order = parseOrder(line);
    // Every item at this step appears once, so its total is its own order's
    // total. A repeated item adds up at the next step.
    totals[order.item] = orderTotal(order);
  }
  return totals;
}`],
  [STARTER_DISCOUNT, `function applyDiscount(total, threshold, percent) {
  if (total > threshold) {
    // percent is a whole number, so 10 takes off a tenth. The comparison and
    // the rounding are the next step.
    return total - total * (percent / 100);
  }
  return total;
}`],
  [STARTER_TRACE, `function trace(label, value) {
  console.log(label, value);
  return value;
}`],
];
const checkpointReference = (stage: number): string => stage <= CHECKPOINT_CHANGES.length
  ? reference(stage - 1).replace(...CHECKPOINT_CHANGES[stage - 1])
  : `${reference(stage - 1)}

function safeReport(lines, threshold, percent) {
  // Every line is good at this step, so nothing is set aside yet.
  return { rows: report(lines, threshold, percent), problems: [] };
}`;

export const DEBUG_EVOLVING_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries(
  [1, 2, 3, 4, 5].flatMap((stage) => [[`${DEBUG_CHALLENGE_ID}-${stage}`, {
    solution: reference(stage),
    junior: junior(stage),
    senior: senior(stage),
    hiddenTests: HIDDEN.slice(0, stage).flat().map(([call, expected]) => ({ call, expected, edge: true })),
  }], [`${DEBUG_CHALLENGE_ID}-${stage}-start`, { solution: checkpointReference(stage) }]]),
);

DEBUG_EVOLVING_SOLUTIONS["js-evolving-debug-1-start"].hiddenTests = [{"call": "(()=>{const spaces=['\\t','\\n','\\v','\\f','\\r',' ','\\u00a0','\\u1680','\\u2000','\\u2001','\\u2002','\\u2003','\\u2004','\\u2005','\\u2006','\\u2007','\\u2008','\\u2009','\\u200a','\\u2028','\\u2029','\\u202f','\\u205f','\\u3000','\\ufeff'],items=['latte','flat white','\u00e9','e\\u0301','__proto__','',String.fromCodePoint(0x1f988),'\\u180eA\\u180e','\\u200bA\\u200b'];for(const space of spaces)for(const item of items){const result=parseOrder(space+item+space+', 003 , 4.50 ');if(result.item!==item||result.quantity!==' 003 '||result.unitPrice!==' 4.50 ')return false;}return true;})()", "expected": true}, {"call": "(()=>{const first=parseOrder(' a ,,'),second=parseOrder(' a ,,');if(first===second||Object.getPrototypeOf(first)!==Object.prototype||Object.keys(first).join(',')!=='item,quantity,unitPrice'||first.item!=='a'||first.quantity!==''||first.unitPrice!=='')return false;first.item='changed';first.quantity='changed';delete first.unitPrice;first.extra=1;const third=parseOrder(' a ,,');return second.item==='a'&&third.item==='a'&&third.quantity===''&&Object.hasOwn(third,'unitPrice')&&third.unitPrice==='';})()", "expected": true}, {"call": "(()=>{const padded=' '.repeat(9998)+'a'+' '.repeat(9999)+',,',first=parseOrder(padded);if(padded.length!==20000||first.item!=='a'||first.quantity!==''||first.unitPrice!=='')return false;const raw='x'.repeat(19998)+',,',second=parseOrder(raw),interior=parseOrder(' A\\tB\\u00a0C , q , p ');return second.item.length===19998&&second.item===raw.slice(0,-2)&&interior.item==='A\\tB\\u00a0C'&&interior.quantity===' q '&&interior.unitPrice===' p ';})()", "expected": true}];

DEBUG_EVOLVING_SOLUTIONS["js-evolving-debug-2-start"].hiddenTests = [{"call": "(()=>{const names=['__proto__','constructor','toString','hasOwnProperty','','10','2','\u00e9','e\\u0301','normal'];for(let seed=0;seed<32;seed++){const rows=[],expected=new Map();for(let i=0;i<names.length;i++){const item=names[(seed+i*3)%names.length],quantity=[0,0.1,2,-1][(seed+i)%4],price=[0.5,2,0][(seed*3+i)%3];rows.push(' '+item+' ,'+quantity+','+price);expected.set(item,quantity*price);}const actual=summarize(Object.freeze(rows)),wanted=['2','10',...[...expected.keys()].filter(k=>k!=='2'&&k!=='10')],keys=Object.keys(actual);if(keys.length!==expected.size||keys.some((key,i)=>key!==wanted[i]))return false;for(const[key,value]of expected){const descriptor=Object.getOwnPropertyDescriptor(actual,key);if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')||descriptor.value!==value)return false;}}return true;})()", "expected": true}, {"call": "(()=>{const lines=Object.freeze(['__proto__,1,2','constructor,1,3','\u00e9,0,4']),first=summarize(lines),second=summarize(lines);if(first===second||!Object.hasOwn(first,'__proto__')||first.__proto__!==2||first.constructor!==3||!Object.hasOwn(first,'\u00e9')||first['\u00e9']!==0)return false;first.constructor=9;delete first.__proto__;first.extra=1;const third=summarize(lines),empty=summarize([]),again=summarize([]);empty.mutable=1;return second.constructor===3&&third.__proto__===2&&third.constructor===3&&Object.keys(again).length===0&&lines.length===3;})()", "expected": true}, {"call": "(()=>{const lines=[];for(let i=0;i<2000;i++)lines.push(i.toString(36)+',1,1');if(lines.reduce((n,v)=>n+v.length,0)>20000)return false;const out=summarize(Object.freeze(lines));if(Object.keys(out).length!==2000)return false;for(let i=0;i<2000;i++)if(!Object.hasOwn(out,i.toString(36))||out[i.toString(36)]!==1)return false;const name='x'.repeat(19996),line=name+',1,1',long=summarize(Object.freeze([line]));return line.length===20000&&Object.keys(long).length===1&&Object.hasOwn(long,name)&&long[name]===1;})()", "expected": true}];

DEBUG_EVOLVING_SOLUTIONS["js-evolving-debug-3-start"].hiddenTests = [{"call": "(()=>{const totals=[0,0.005,0.05,0.1,0.18,0.35,1,7.5,19.999,33.33,1000000000],percentages=[0,1,10,30,65,75,99,100];for(const total of totals)for(const percent of percentages)for(const threshold of[0,total,Math.min(1e9,total+0.001)]){const removed=total*(percent/100),discounted=total-removed,expected=total>threshold?discounted:total,actual=applyDiscount(total,threshold,percent);if(typeof actual!=='number'||actual!==expected)return false;}return true;})()", "expected": true}, {"call": "(()=>{const unrounded=applyDiscount(33.33,10,10),same=applyDiscount(0.05,0.05,30),below=applyDiscount(19.999,20,50);return unrounded===33.33-33.33*(10/100)&&unrounded!==30&&same===0.05&&below===19.999&&applyDiscount(1e9,0,100)===0;})()", "expected": true}, {"call": "(()=>{for(let i=0;i<10000;i++){const total=(i%100)/100+1e-7,threshold=(i%3)*0.25,percent=i%101,removed=total*(percent/100),discounted=total-removed,expected=total>threshold?discounted:total;if(applyDiscount(total,threshold,percent)!==expected)return false;}return true;})()", "expected": true}];
