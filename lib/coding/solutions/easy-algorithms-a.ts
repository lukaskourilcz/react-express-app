// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-algorithms-a.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, an input the prompt protects,
// a plain object where a Map keeps keys apart, a text sort where numbers were
// asked for, and the slow version the technique exists to replace.

import type { CodingSolution } from '../types';
import { tree, withList, withTree } from '../tasks/easy-algorithms-a';

export const EASY_ALGORITHMS_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── hash maps, sets and plain objects ─────────────────────────────── */
  'alg-easy2-count-jewels': {
    solution: "const countJewels = (jewels, stones) => {\n  // One Set lookup per stone, where includes would rescan the jewels each time.\n  const kinds = new Set(jewels);\n  let count = 0;\n  for (const stone of stones) {\n    if (kinds.has(stone)) count += 1;\n  }\n  return count;\n};",
    junior: "const countJewels = (jewels, stones) => {\n  const kinds = new Set();\n  for (const jewel of jewels) {\n    kinds.add(jewel);\n  }\n  let count = 0;\n  for (const stone of stones) {\n    if (kinds.has(stone)) {\n      count = count + 1;\n    }\n  }\n  return count;\n};",
    senior: "const countJewels = (jewels, stones) => {\n  const kinds = new Set(jewels);\n  let count = 0;\n  for (const stone of stones) count += kinds.has(stone) ? 1 : 0;\n  return count;\n};",
    hiddenTests: [
      { call: "[countJewels(\"\ud83d\ude00\",\"\ud83d\ude00\ud83d\ude00\ud83d\ude03\"),countJewels(\"\ud83d\ude00\ud83d\ude00\",\"\ud83d\ude00\"),countJewels(\"a\\u030a\",\"\u00e5\"),countJewels(\"\\ud800\",\"\\ud800x\\ud800\")]", expected: [2, 1, 0, 2] },
      { call: "[countJewels(\" \\n\",\" \\nx\"),countJewels(\"Aa\",\"aAaa\"),countJewels(\"a\",\"bbb\"),countJewels(\"a\",\"a\"),countJewels(\"\",\" \")]", expected: [2, 4, 0, 1, 0] },
      { call: "[countJewels(\"a\".repeat(1000),\"a\".repeat(1000)),countJewels(\"\ud83d\ude00\".repeat(500),\"\ud83d\ude00\".repeat(500)),countJewels(\"z\",\"a\".repeat(1000))]", expected: [1000, 500, 0] },

      { call: 'countJewels("aa", "a")', expected: 1 },
      { call: 'countJewels("xyz", "xyzxyz")', expected: 6 },
      { call: 'countJewels("!1 ", "a 1!b")', expected: 3 },
      { call: 'countJewels("b", "abcabc")', expected: 2 },
    ],
  },
  'alg-easy2-letters-for-a-note': {
    solution: "const canWrite = (note, magazine) => {\n  // How many of each character the magazine still has to give.\n  const counts = {};\n  for (const char of magazine) {\n    counts[char] = (counts[char] || 0) + 1;\n  }\n  for (const char of note) {\n    if (!counts[char]) return false; // missing, or all used up\n    counts[char] -= 1;\n  }\n  return true;\n};",
    junior: "const canWrite = (note, magazine) => {\n  const counts = {};\n  for (const char of magazine) {\n    if (counts[char] === undefined) {\n      counts[char] = 0;\n    }\n    counts[char] = counts[char] + 1;\n  }\n  for (const char of note) {\n    if (counts[char] === undefined || counts[char] === 0) {\n      return false;\n    }\n    counts[char] = counts[char] - 1;\n  }\n  return true;\n};",
    senior: "const canWrite = (note, magazine) => {\n  const counts = new Map();\n  for (const char of magazine) counts.set(char, (counts.get(char) ?? 0) + 1);\n  for (const char of note) {\n    const left = counts.get(char) ?? 0;\n    if (left === 0) return false;\n    counts.set(char, left - 1);\n  }\n  return true;\n};",
    hiddenTests: [
      { call: "[canWrite(\"\ud83d\ude00\ud83d\ude00\",\"\ud83d\ude00\"),canWrite(\"\ud83d\ude00\ud83d\ude03\",\"\ud83d\ude03\ud83d\ude00\"),canWrite(String.fromCodePoint(0x1f600,0x1d11e),String.fromCodePoint(0x1f51e,0x1d200)),canWrite(\"\u00e9\",\"e\\u0301\"),canWrite(\"\\ud800\",\"\\ud800\")]", expected: [false, true, false, false, true] },
      { call: "[canWrite(\" \\n\",\"\\n \"),canWrite(\"a\",\"a\"),canWrite(\"a\",\"\"),canWrite(\"\",\"\"),canWrite(\"A\",\"a\"),canWrite(\"a\",\"a\")]", expected: [true, true, false, true, false, true] },
      { call: "[canWrite(\"a\".repeat(1000),\"a\".repeat(1000)),canWrite(\"a\".repeat(1000),\"a\".repeat(999)),canWrite(\"\ud83d\ude00\".repeat(500),\"\ud83d\ude00\".repeat(500))]", expected: [true, false, true] },

      { call: 'canWrite("hello world", "dlrow olleh")', expected: true },
      { call: 'canWrite("a b", "ab")', expected: false },
      { call: 'canWrite("abcabc", "aabbc")', expected: false },
      { call: 'canWrite("zzz", "zzzz")', expected: true },
    ],
  },
  'alg-easy2-majority-value': {
    solution: "const majority = values => {\n  const counts = new Map();\n  for (const value of values) {\n    const count = (counts.get(value) ?? 0) + 1;\n    counts.set(value, count);\n    // The first value past half is the only one that can get there.\n    if (count > values.length / 2) return value;\n  }\n  return null;\n};",
    junior: "const majority = values => {\n  const counts = new Map();\n  for (const value of values) {\n    if (!counts.has(value)) {\n      counts.set(value, 0);\n    }\n    counts.set(value, counts.get(value) + 1);\n  }\n  for (const [value, count] of counts) {\n    if (count > values.length / 2) {\n      return value;\n    }\n  }\n  return null;\n};",
    senior: "const majority = (values) => {\n  const same = (a, b) => a === b || (a !== a && b !== b);\n  let candidate = null;\n  let lead = 0;\n  for (const value of values) {\n    if (lead === 0) candidate = value;\n    lead += same(value, candidate) ? 1 : -1;\n  }\n  let count = 0;\n  for (const value of values) if (same(value, candidate)) count += 1;\n  return count > values.length / 2 ? candidate : null;\n};",
    hiddenTests: [
      { call: "(() => {const a={},b={};const symbol=Symbol(\"s\");return [Number.isNaN(majority(Object.freeze([NaN,1,NaN]))),majority([a,b,a])===a,majority([a,b])===null,majority([symbol,symbol,Symbol(\"s\")])===symbol,majority([undefined,undefined,1])===undefined,majority([null,null,1])===null,majority([-0,0,-0])===0,majority([\"__proto__\",1,\"__proto__\"])];})()", expected: [true, true, true, true, true, true, true, "__proto__"] },
      { call: "(() => {const item=Object.freeze({keep:1}),input=Object.freeze([item,0,item]);const out=majority(input);const mutable=[1,2,1];majority(mutable);return [out===item,item.keep,input[0]===item,mutable,majority([1,\"1\"])===null,majority([1,\"1\",\"1\"])===\"1\"];})()", expected: [true, 1, true, [1, 2, 1], true, true] },
      { call: "[majority(Object.freeze(Array.from({length:1000},(_,i)=>i<501?7:i))),majority(Object.freeze(Array.from({length:1000},(_,i)=>i<500?7:i)))===null,majority([])===null]", expected: [7, true, true] },

      { call: 'majority([1, "1", 1])', expected: 1 },
      { call: 'majority([0, 0, 1])', expected: 0 },
      { call: 'majority([2, 2, 1, 1, 1, 2, 2])', expected: 2 },
      { call: 'majority([5, 5, 6, 6, 7])', expected: null },
    ],
  },
  'alg-easy2-happy-number': {
    solution: "const isHappy = n => {\n  const seen = new Set();\n  while (n !== 1) {\n    // A number met before means the sequence is going round a cycle.\n    if (seen.has(n)) return false;\n    seen.add(n);\n    let next = 0;\n    while (n > 0) {\n      const digit = n % 10;\n      next += digit * digit;\n      n = Math.floor(n / 10);\n    }\n    n = next;\n  }\n  return true;\n};",
    junior: "const isHappy = n => {\n  const seen = new Set();\n  let current = n;\n  while (current !== 1) {\n    if (seen.has(current)) {\n      return false;\n    }\n    seen.add(current);\n    const digits = String(current).split(\"\");\n    let sum = 0;\n    for (let i = 0; i < digits.length; i++) {\n      sum = sum + Number(digits[i]) * Number(digits[i]);\n    }\n    current = sum;\n  }\n  return true;\n};",
    senior: "const squareDigits = (n) => [...String(n)].reduce((sum, digit) => sum + Number(digit) ** 2, 0);\n\nconst isHappy = (n) => {\n  const seen = new Set();\n  while (n !== 1 && !seen.has(n)) {\n    seen.add(n);\n    n = squareDigits(n);\n  }\n  return n === 1;\n};",
    hiddenTests: [
      { call: "[isHappy(1000000000000000),isHappy(1111111111111),isHappy(1111111111111111),isHappy(10),isHappy(16),isHappy(19),isHappy(2)]", expected: [true, true, false, true, false, true, false] },
      { call: "Array.from({length:16},(_,exponent)=>isHappy(10**exponent)).every(value=>value===true)", expected: true },
      { call: "[isHappy(4),isHappy(1),isHappy(4),isHappy(1),isHappy(89),isHappy(7),typeof isHappy(19),typeof isHappy(2)]", expected: [false, true, false, true, false, true, "boolean", "boolean"] },

      { call: 'isHappy(100)', expected: true },
      { call: 'isHappy(20)', expected: false },
      { call: 'isHappy(1111111)', expected: true },
      { call: 'isHappy(89)', expected: false },
    ],
  },

  /* ── strings and one-pass scans ────────────────────────────────────── */
  'alg-easy2-common-prefix': {
    solution: "const commonPrefix = words => {\n  if (words.length === 0) return \"\";\n  const first = words[0];\n  for (let i = 0; i < first.length; i++) {\n    for (const word of words) {\n      // A shorter word reads undefined here, which also ends the prefix.\n      if (word[i] !== first[i]) return first.slice(0, i);\n    }\n  }\n  return first;\n};",
    junior: "const commonPrefix = words => {\n  if (words.length === 0) return \"\";\n  const first = words[0];\n  let length = 0;\n  for (; length < first.length; length += 1) {\n    const character = first[length];\n    for (let word = 1; word < words.length; word += 1) {\n      if (words[word][length] !== character) return first.slice(0, length);\n    }\n  }\n  return first.slice(0, length);\n};",
    senior: "const commonPrefix = words => {\n  if (words.length === 0) return \"\";\n  const first = words[0];\n  let length = first.length;\n  for (let word = 1; word < words.length && length > 0; word += 1) {\n    let shared = 0;\n    while (shared < length && shared < words[word].length && first[shared] === words[word][shared]) shared += 1;\n    length = shared;\n  }\n  return first.slice(0, length);\n};",
    hiddenTests: [
      { call: "(() => {const input=[\"flow\",\"flower\",\"flight\"];const result=commonPrefix(input);const units=commonPrefix(Object.freeze([\"\ud83d\ude00a\",\"\ud83d\ude03b\"]));return [result,input,units.length,units.charCodeAt(0),commonPrefix([\"e\\u0301\",\"\u00e9\"]),commonPrefix([\" A\",\" a\"]),commonPrefix([\"abc\",\"\"])];})()", expected: ["fl", ["flow", "flower", "flight"], 1, 55357, "", " ", ""] },
      { call: "[commonPrefix(Object.freeze([\"a\\u0000b\",\"a\\u0000c\"])),commonPrefix(Object.freeze([\"\\ud800x\",\"\\ud800y\"])),commonPrefix(Object.freeze([])),commonPrefix(Object.freeze([\"\",\"\"])),commonPrefix([\"abc\",\"abc\"])]", expected: ["a\u0000", "\ud800", "", "", "abc"] },
      { call: "(() => {const word=\"a\".repeat(1000);const many=Object.freeze(Array.from({length:1000},()=>word));return [commonPrefix(many)===word,commonPrefix([word,\"a\".repeat(500)+\"b\".repeat(500)]).length,many.length];})()", expected: [true, 500, 1000] },

      { call: 'commonPrefix(["interview", "internet", "interval", "in"])', expected: 'in' },
      { call: 'commonPrefix(["abc", "abd", "xbc"])', expected: '' },
      { call: 'commonPrefix(["", "abc"])', expected: '' },
      { call: 'commonPrefix(["prefix", "prefixes", "pre"])', expected: 'pre' },
    ],
  },
  'alg-easy2-roman-numerals': {
    solution: "const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };\n\nconst fromRoman = numeral => {\n  let total = 0;\n  for (let i = 0; i < numeral.length; i++) {\n    const value = VALUES[numeral[i]];\n    // Past the end there is no next letter, so the last one is always added.\n    const next = VALUES[numeral[i + 1]] ?? 0;\n    total += value < next ? -value : value;\n  }\n  return total;\n};",
    junior: "const fromRoman = numeral => {\n  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };\n  let total = 0;\n  for (let i = 0; i < numeral.length; i++) {\n    const value = values[numeral[i]];\n    if (i + 1 < numeral.length && value < values[numeral[i + 1]]) {\n      total = total - value;\n    } else {\n      total = total + value;\n    }\n  }\n  return total;\n};",
    senior: "const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };\n\nconst fromRoman = (numeral) => {\n  let total = 0;\n  let previous = 0;\n  for (let i = numeral.length - 1; i >= 0; i--) {\n    const value = VALUES[numeral[i]];\n    total += value < previous ? -value : value;\n    previous = value;\n  }\n  return total;\n};",
    hiddenTests: [
      { call: "[fromRoman(\"I\"),fromRoman(\"V\"),fromRoman(\"X\"),fromRoman(\"L\"),fromRoman(\"C\"),fromRoman(\"D\"),fromRoman(\"M\"),fromRoman(\"\")]", expected: [1, 5, 10, 50, 100, 500, 1000, 0] },
      { call: "[\"IV\",\"IX\",\"XL\",\"XC\",\"CD\",\"CM\",\"MMMDCCCLXXXVIII\"].map(fromRoman)", expected: [4, 9, 40, 90, 400, 900, 3888] },
      { call: "(() => {const thousands=[\"\",\"M\",\"MM\",\"MMM\"],hundreds=[\"\",\"C\",\"CC\",\"CCC\",\"CD\",\"D\",\"DC\",\"DCC\",\"DCCC\",\"CM\"],tens=[\"\",\"X\",\"XX\",\"XXX\",\"XL\",\"L\",\"LX\",\"LXX\",\"LXXX\",\"XC\"],ones=[\"\",\"I\",\"II\",\"III\",\"IV\",\"V\",\"VI\",\"VII\",\"VIII\",\"IX\"];for(let n=1;n<=3999;n++){const numeral=thousands[Math.floor(n/1000)]+hundreds[Math.floor(n/100)%10]+tens[Math.floor(n/10)%10]+ones[n%10];if(fromRoman(numeral)!==n)return false;}return true;})()", expected: true },

      { call: 'fromRoman("XL")', expected: 40 },
      { call: 'fromRoman("CDXLIV")', expected: 444 },
      { call: 'fromRoman("MMXXVI")', expected: 2026 },
      { call: 'fromRoman("III")', expected: 3 },
    ],
  },
  'alg-easy2-second-largest': {
    solution: `const secondLargest = numbers => {
  let largest = -Infinity;
  let second = -Infinity;
  for (const n of numbers) {
    if (n > largest) {
      second = largest; // the old maximum is now the runner-up
      largest = n;
    } else if (n < largest && n > second) {
      second = n; // a tie with the maximum changes nothing
    }
  }
  return second === -Infinity ? null : second;
};`,
    junior: `const secondLargest = numbers => {
  let largest = null;
  let second = null;
  for (const n of numbers) {
    if (largest === null || n > largest) {
      second = largest;
      largest = n;
    } else if (n !== largest && (second === null || n > second)) {
      second = n;
    }
  }
  return second;
};`,
    senior: `const secondLargest = (numbers) => {
  let [largest, second] = [-Infinity, -Infinity];
  for (const n of numbers) {
    if (n > largest) [largest, second] = [n, largest];
    else if (n < largest && n > second) second = n;
  }
  return second === -Infinity ? null : second;
};`,
    hiddenTests: [
      { call: "(() => {const input=[4,9,7,9,4];const copy=input.slice();const answer=secondLargest(input);return [answer,input.every((n,i)=>Object.is(n,copy[i])),secondLargest(Object.freeze([-1.5,-2.5,-1.5,-3])),secondLargest(Object.freeze([Number.MAX_VALUE,-Number.MAX_VALUE])),secondLargest(Object.freeze([Number.MIN_VALUE,0,-0]))];})()", expected: [7, true, -2.5, -1.7976931348623157e+308, 0] },
      { call: "[secondLargest([2,1]),secondLargest([1,2]),secondLargest([-0,0]),secondLargest([3,3,3,2,2]),secondLargest([-1,-2]),secondLargest([-2,-1])]", expected: [1, 1, null, 2, -2, -2] },
      { call: "(() => {const values=Object.freeze(Array.from({length:2000},(_,i)=>Math.floor((1999-i)/2)));return [secondLargest(values),values[0],values[1999],secondLargest(Object.freeze([]))];})()", expected: [998, 999, 0, null] },

      { call: 'secondLargest([1, 2, 3, 4, 5])', expected: 4 },
      { call: 'secondLargest([10])', expected: null },
      { call: 'secondLargest([3, 10, 10, 9, 1])', expected: 9 },
      { call: 'secondLargest([0, -1])', expected: -1 },
    ],
  },
  'alg-easy2-best-trade': {
    solution: `const bestTrade = prices => {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    // Selling today earns the most after buying on the cheapest day before it.
    if (price - lowest > best) best = price - lowest;
    if (price < lowest) lowest = price;
  }
  return best;
};`,
    junior: `const bestTrade = prices => {
  if (prices.length < 2) {
    return 0;
  }
  let lowest = prices[0];
  let best = 0;
  for (const price of prices) {
    if (price < lowest) {
      lowest = price;
    }
    const profit = price - lowest;
    if (profit > best) {
      best = profit;
    }
  }
  return best;
};`,
    senior: `const bestTrade = (prices) => {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    lowest = Math.min(lowest, price);
    best = Math.max(best, price - lowest);
  }
  return best;
};`,
    hiddenTests: [
      { call: "(() => {const input=[5,0,4];const original=input.slice();return [bestTrade(input),input.every((v,i)=>Object.is(v,original[i])),bestTrade(Object.freeze([0,1])),bestTrade(Object.freeze([1,0])),bestTrade(Object.freeze([1.25,1.5,1])),bestTrade(Object.freeze([-0,0,2])),bestTrade([1,4,2,8])];})()", expected: [4, true, 1, 0, 0.25, 2, 7] },
      { call: "(() => {for(let length=0;length<=5;length++){for(let code=0;code<Math.pow(4,length);code++){let digits=code;const values=[];for(let i=0;i<length;i++){values.push(digits%4);digits=Math.floor(digits/4);}let wanted=0;for(let buy=0;buy<length;buy++)for(let sell=buy+1;sell<length;sell++)wanted=Math.max(wanted,values[sell]-values[buy]);if(bestTrade(Object.freeze(values))!==wanted)return false;}}return true;})()", expected: true },
      { call: "[bestTrade(Object.freeze(Array.from({length:2000},(_,i)=>i))),bestTrade(Object.freeze(Array.from({length:2000},(_,i)=>2000-i))),bestTrade(Object.freeze([1000000000,0,999999999])),bestTrade(Object.freeze([])),bestTrade(Object.freeze([0]))]", expected: [1999, 0, 999999999, 0, 0] },

      { call: 'bestTrade([3, 8, 1, 4])', expected: 5 },
      { call: 'bestTrade([1, 2, 3, 4, 5])', expected: 4 },
      { call: 'bestTrade([4, 4, 4])', expected: 0 },
      { call: 'bestTrade([9, 2, 5, 1, 7])', expected: 6 },
    ],
  },
  'alg-easy2-fewest-coins': {
    solution: `const COINS = [50, 20, 10, 5, 2, 1];

const makeChange = cents => {
  const change = {};
  for (const coin of COINS) {
    // Largest first: take this coin for as long as it fits.
    while (cents >= coin) {
      change[coin] = (change[coin] || 0) + 1;
      cents -= coin;
    }
  }
  return change;
};`,
    junior: `const makeChange = cents => {
  const coins = [50, 20, 10, 5, 2, 1];
  const change = {};
  let left = cents;
  let i = 0;
  while (left > 0) {
    const coin = coins[i];
    if (left >= coin) {
      if (change[coin] === undefined) {
        change[coin] = 0;
      }
      change[coin] = change[coin] + 1;
      left = left - coin;
    } else {
      i = i + 1;
    }
  }
  return change;
};`,
    senior: `const COINS = [50, 20, 10, 5, 2, 1];

const makeChange = (cents) => {
  const change = {};
  for (const coin of COINS) {
    const count = Math.floor(cents / coin);
    if (count > 0) change[coin] = count;
    cents %= coin;
  }
  return change;
};`,
    hiddenTests: [
      { call: "(() => {const first=makeChange(76),again=makeChange(76),zero=makeChange(0),zero2=makeChange(0);const initial=[first!==again,zero!==zero2,first[50]===1&&first[20]===1&&first[5]===1&&first[1]===1];first[50]=99;zero[1]=1;return [...initial,again[50]===1,Object.keys(zero2).length===0,makeChange(10000)[50]===200];})()", expected: [true, true, true, true, true, true] },
      { call: "(() => {const coins=[1,2,5,10,20,50],best=[0];for(let amount=1;amount<=1000;amount++){let minimum=Infinity;for(const coin of coins)if(coin<=amount)minimum=Math.min(minimum,1+best[amount-coin]);best[amount]=minimum;const result=makeChange(amount);let count=0,total=0;for(const key of Object.keys(result)){const coin=Number(key),quantity=result[key];if(!coins.includes(coin)||!Number.isInteger(quantity)||quantity<1)return false;total+=coin*quantity;count+=quantity;}if(total!==amount||count!==minimum)return false;}return true;})()", expected: true },
      { call: "[makeChange(0),makeChange(4),makeChange(6),makeChange(30),makeChange(60),makeChange(100)]", expected: [{}, {"2": 2}, {"5": 1, "1": 1}, {"20": 1, "10": 1}, {"50": 1, "10": 1}, {"50": 2}] },

      { call: 'makeChange(1)', expected: { 1: 1 } },
      { call: 'makeChange(99)', expected: { 50: 1, 20: 2, 5: 1, 2: 2 } },
      { call: 'makeChange(500)', expected: { 50: 10 } },
      { call: 'makeChange(8)', expected: { 5: 1, 2: 1, 1: 1 } },
    ],
  },

  /* ── two pointers and halving ──────────────────────────────────────── */
  'alg-easy2-first-broken-build': {
    solution: `const firstBroken = (n, isBroken) => {
  let low = 1;
  let high = n;
  let found = null;
  // Every build in low..high is still a candidate; each check halves the range.
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (isBroken(mid)) {
      found = mid; // it could be the first, so keep looking to its left
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return found;
};`,
    junior: `const firstBroken = (n, isBroken) => {
  let low = 1;
  let high = n;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (isBroken(mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  if (n >= 1 && isBroken(low)) {
    return low;
  }
  return null;
};`,
    senior: `const firstBroken = (n, isBroken) => {
  let [low, high] = [1, n + 1];
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (isBroken(mid)) high = mid;
    else low = mid + 1;
  }
  return low <= n ? low : null;
};`,
    hiddenTests: [
      { call: "(() => {const n=Number.MAX_SAFE_INTEGER,thresholds=[1,4503599627370497,n,null];for(const threshold of thresholds){let checks=0;const result=firstBroken(n,function(build){checks++;if(arguments.length!==1||this!==undefined||!Number.isSafeInteger(build)||build<1||build>n)throw Error(\"invalid query\");return threshold!==null&&build>=threshold;});if(result!==threshold||checks>54)return false;}let checks=0;const none=firstBroken(0,()=>{checks++;throw Error(\"empty query\");});return none===null&&checks===0;})()", expected: true },
      { call: "(() => {for(let n=1;n<=64;n++){for(let first=1;first<=n+1;first++){let checks=0;const result=firstBroken(n,function(build){checks++;if(this!==undefined||arguments.length!==1||!Number.isInteger(build)||build<1||build>n)throw Error(\"invalid query\");return build>=first;});if(result!==(first<=n?first:null)||checks>Math.ceil(Math.log2(n+1))+1)return false;}}return true;})()", expected: true },
      { call: "(() => {const error=Object.freeze({reason:\"predicate\"});let caught;try{firstBroken(10,()=>{throw error;});}catch(value){caught=value;}return [caught===error,(() => {let checks=0;return firstBroken(4294967296,build=>{if(++checks>34||!Number.isSafeInteger(build)||build<1||build>4294967296)throw Error(\"invalid query\");return build>=4294967295;});})(),firstBroken(100,()=>false)];})()", expected: [true, 4294967295, null] },

      { call: '(() => { let checks = 0; const first = firstBroken(1000000, build => { checks += 1; return build >= 999999; }); return [first, checks <= 21]; })()', expected: [999999, true] },
      { call: '(() => { let checks = 0; const first = firstBroken(64, () => { checks += 1; return false; }); return [first, checks <= 7]; })()', expected: [null, true] },
      { call: 'firstBroken(2, build => build >= 2)', expected: 2 },
      { call: '(() => { const asked = []; firstBroken(100, build => { asked.push(build); return build >= 50; }); return asked.every(build => Number.isInteger(build) && build >= 1 && build <= 100); })()', expected: true },
    ],
  },
  'alg-easy2-middle-of-list': {
    solution: `const middle = head => {
  let slow = head;
  let fast = head;
  // fast moves twice as far, so it reaches the end when slow is halfway.
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
};`,
    junior: `const middle = head => {
  let slow = head;
  let fast = head;
  while (fast !== null) {
    const next = fast.next;
    if (next === null) break;
    slow = slow.next;
    fast = next.next;
  }
  return slow;
};`,
    senior: `const middle = (head) => {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
};`,
    hiddenTests: [
      { call: "(() => {const payload=Object.freeze({id:1}),last=Object.freeze({value:payload,next:null}),head=Object.freeze({value:undefined,next:last});const a=middle(last),b=middle(head);return [a===last,b===last,head.next===last,last.value===payload,last.next===null,middle(null)===null];})()", expected: [true, true, true, true, true, true] },
      { call: "(() => {for(let n=0;n<=32;n++){const nodes=[];let head=null;for(let i=n-1;i>=0;i--){nodes[i]=Object.freeze(Object.assign(Object.create(null),{value:i%2?undefined:0,next:head}));head=nodes[i];}if(middle(head)!==(nodes[Math.floor(n/2)]??null))return false;for(let i=0;i<n;i++)if(nodes[i].next!==(nodes[i+1]??null))return false;}return true;})()", expected: true },
      { call: "(() => {const nodes=[];let head=null;for(let i=1999;i>=0;i--){nodes[i]=Object.freeze({value:Symbol(\"node\"),next:head});head=nodes[i];}const result=middle(head);return [result===nodes[1000],nodes.every((node,i)=>node.next===(nodes[i+1]??null)),middle(head)===result];})()", expected: [true, true, true] },

      { call: withList('return middle(list(1, 2)).value;'), expected: 2 },
      { call: withList('return middle(list(1, 2, 3, 4, 5, 6, 7)).value;'), expected: 4 },
      { call: withList('const head = list(5, 5, 5, 5); return middle(head) === head.next.next;'), expected: true },
      { call: withList('const head = list(1, 2, 3, 4); middle(head); const values = []; for (let node = head; node !== null; node = node.next) values.push(node.value); return values;'), expected: [1, 2, 3, 4] },
    ],
  },

  /* ── sorting first ─────────────────────────────────────────────────── */
  'alg-easy2-meetings-clash': {
    solution: `const hasClash = meetings => {
  // Sort a copy: sort reorders the array it is called on.
  const sorted = meetings.filter(([start, end]) => start < end).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    // In start order, a clash always shows up between neighbours.
    if (sorted[i][0] < sorted[i - 1][1]) return true;
  }
  return false;
};`,
    junior: `const hasClash = meetings => {
  const sorted = meetings.filter(meeting => meeting[0] < meeting[1]);
  sorted.sort(function (a, b) {
    return a[0] - b[0];
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (next[0] < current[1]) {
      return true;
    }
  }
  return false;
};`,
    senior: `const hasClash = (meetings) =>
  meetings
    .filter(([start, end]) => start < end)
    .sort(([a], [b]) => a - b)
    .some(([start], i, sorted) => i > 0 && start < sorted[i - 1][1]);`,
    hiddenTests: [
      { call: "(() => {const values=[[0,2],[1,1]],copy=values.map(pair=>pair.slice());return [hasClash(values),values.every((pair,i)=>pair.every((v,j)=>Object.is(v,copy[i][j]))),hasClash(Object.freeze([Object.freeze([0,.5]),Object.freeze([.5,1])])),hasClash([[0,.5],[.25,.75]]),hasClash([[1,1],[1,1]])];})()", expected: [false, true, false, true, false] },
      { call: "(() => {const choices=[[0,0],[0,1],[0,2],[1,1],[1,2],[2,2]];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(Object.freeze(choices[digits%6].slice()));digits=Math.floor(digits/6);}let wanted=false;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.max(input[i][0],input[j][0])<Math.min(input[i][1],input[j][1]))wanted=true;if(hasClash(Object.freeze(input))!==wanted)return false;}return true;})()", expected: true },
      { call: "[hasClash(Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze([i/2,(i+1)/2])))),hasClash(Object.freeze(Array.from({length:2000},()=>Object.freeze([0,1440])))),hasClash(Object.freeze(Array.from({length:2000},()=>Object.freeze([720,720]))))]", expected: [false, true, false] },

      { call: '(() => { const meetings = [[5, 6], [1, 2]]; hasClash(meetings); return meetings; })()', expected: [[5, 6], [1, 2]] },
      { call: 'hasClash([[1, 10], [2, 3], [11, 12]])', expected: true },
      { call: 'hasClash([[10, 20], [2, 9], [100, 200], [20, 30]])', expected: false },
      { call: 'hasClash([[4, 8], [4, 5]])', expected: true },
      { call: 'hasClash([[1, 5], [3, 8]])', expected: true },
    ],
  },
  'alg-easy2-median': {
    solution: `const median = numbers => {
  if (numbers.length === 0) return null;
  // Copy first, and compare as numbers: the default sort compares text.
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
};`,
    junior: `const median = numbers => {
  if (numbers.length === 0) {
    return null;
  }
  const sorted = numbers.slice();
  sorted.sort(function (a, b) {
    return a - b;
  });
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const sum = sorted[mid - 1] + sorted[mid];
    return sum / 2;
  }
  return sorted[mid];
};`,
    senior: `const median = (numbers) => {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};`,
    hiddenTests: [
      { call: "(() => {const values=[.5,.125],before=values.slice();return [median(values),values.every((v,i)=>Object.is(v,before[i])),median(Object.freeze([3.25,-2,.125])),median(Object.freeze([])),median(Object.freeze([-0]))===0];})()", expected: [0.3125, true, 0.125, null, true] },
      { call: "(() => {const alphabet=[-1,.125,0,5];for(let n=0;n<=5;n++)for(let code=0;code<4**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(alphabet[digits%4]);digits=Math.floor(digits/4);}const ordered=[];for(const value of input){let i=0;while(i<ordered.length&&ordered[i]<value)i++;ordered.splice(i,0,value);}const mid=Math.floor(n/2),wanted=n===0?null:n%2?ordered[mid]:(ordered[mid-1]+ordered[mid])/2;if(median(Object.freeze(input))!==wanted)return false;}return true;})()", expected: true },
      { call: "(() => {const input=Array.from({length:2000},(_,i)=>i%2?1000000000000:-1000000000000),signs=[-0,0];const result=median(Object.freeze(input));median(signs);return [result,Object.is(signs[0],-0),Object.is(signs[1],0),median(Object.freeze([1000000000000,1000000000000]))];})()", expected: [0, true, true, 1000000000000] },

      { call: '(() => { const numbers = [3, 1, 2]; median(numbers); return numbers; })()', expected: [3, 1, 2] },
      { call: 'median([-5, -1, -3, -2])', expected: -2.5 },
      { call: 'median([2, 2, 2, 9])', expected: 2 },
      { call: 'median([1, 1000, 25, 3, 7])', expected: 7 },
    ],
  },
  'alg-easy2-product-of-three': {
    solution: `const maxProductOfThree = numbers => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;
  // The winner uses the three largest, or the two most negative with the largest.
  const threeLargest = sorted[n - 1] * sorted[n - 2] * sorted[n - 3];
  const twoSmallestAndLargest = sorted[0] * sorted[1] * sorted[n - 1];
  return Math.max(threeLargest, twoSmallestAndLargest);
};`,
    junior: `const maxProductOfThree = numbers => {
  const sorted = numbers.slice();
  sorted.sort(function (a, b) {
    return a - b;
  });
  const last = sorted.length - 1;
  const a = sorted[last] * sorted[last - 1] * sorted[last - 2];
  const b = sorted[0] * sorted[1] * sorted[last];
  if (a > b) {
    return a;
  }
  return b;
};`,
    senior: `const maxProductOfThree = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const [smallest, nextSmallest] = sorted;
  const [third, second, largest] = sorted.slice(-3);
  return Math.max(largest * second * third, smallest * nextSmallest * largest);
};`,
    hiddenTests: [
      { call: "(() => {const input=[-100000,-100000,100000],copy=input.slice();return [maxProductOfThree(Object.freeze(input)),input.every((v,i)=>Object.is(v,copy[i])),maxProductOfThree(Object.freeze([-100000,-99999,-99998])),maxProductOfThree(Object.freeze([0,-0,-1]))===0];})()", expected: [1000000000000000, true, -999970000200000, true] },
      { call: "(() => {const alphabet=[-3,-1,0,2];for(let n=3;n<=5;n++)for(let code=0;code<4**n;code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%4]);digits=Math.floor(digits/4);}let wanted=-Infinity;for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++)wanted=Math.max(wanted,values[a]*values[b]*values[c]);if(maxProductOfThree(Object.freeze(values))!==wanted)return false;}return true;})()", expected: true },
      { call: "(() => {const values=Array.from({length:2000},(_,i)=>i<2?-100000:i===2?100000:0),signs=[-0,0,1,2];maxProductOfThree(signs);return [maxProductOfThree(Object.freeze(values)),Object.is(signs[0],-0),Object.is(signs[1],0),maxProductOfThree(Object.freeze([2,2,2]))];})()", expected: [1000000000000000, true, true, 8] },

      { call: 'maxProductOfThree([-5, -4, 1, 2, 3])', expected: 60 },
      { call: 'maxProductOfThree([-100, 1, 2, 3])', expected: 6 },
      { call: 'maxProductOfThree([100, 20, 9, 8, 7, 1000])', expected: 2000000 },
      { call: '(() => { const numbers = [3, 1, 2]; maxProductOfThree(numbers); return numbers; })()', expected: [3, 1, 2] },
    ],
  },
  'alg-easy2-hand-out-snacks': {
    solution: `const happyChildren = (appetites, snacks) => {
  const children = [...appetites].sort((a, b) => a - b);
  const sizes = [...snacks].sort((a, b) => a - b);
  let child = 0;
  for (let snack = 0; snack < sizes.length && child < children.length; snack++) {
    // A snack too small for the least hungry child fits nobody: skip it.
    if (sizes[snack] >= children[child]) child++;
  }
  return child;
};`,
    junior: `const happyChildren = (appetites, snacks) => {
  const children = appetites.slice().sort(function (a, b) {
    return a - b;
  });
  const sizes = snacks.slice().sort(function (a, b) {
    return a - b;
  });
  let child = 0;
  let snack = 0;
  let happy = 0;
  while (child < children.length && snack < sizes.length) {
    if (sizes[snack] >= children[child]) {
      happy = happy + 1;
      child = child + 1;
    }
    snack = snack + 1;
  }
  return happy;
};`,
    senior: `const byNumber = (a, b) => a - b;

const happyChildren = (appetites, snacks) => {
  const children = [...appetites].sort(byNumber);
  let happy = 0;
  for (const size of [...snacks].sort(byNumber)) {
    if (happy < children.length && size >= children[happy]) happy += 1;
  }
  return happy;
};`,
    hiddenTests: [
      { call: "(() => {const appetites=[.75,0,1.25],snacks=[.5,0,1.25],a=appetites.slice(),s=snacks.slice(),same=Object.freeze([-0,0,1000000000]);return [happyChildren(appetites,snacks),appetites.every((v,i)=>Object.is(v,a[i])),snacks.every((v,i)=>Object.is(v,s[i])),happyChildren(same,same),happyChildren(Object.freeze([.75]),Object.freeze([.5]))];})()", expected: [2, true, true, 3, 0] },
      { call: "(() => {const arrays=[[]],alphabet=[0,.5,2];for(let n=1;n<=3;n++)for(let code=0;code<3**n;code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%3]);digits=Math.floor(digits/3);}arrays.push(values);}for(const a of arrays)for(const s of arrays){const match=(i,used)=>{if(i===a.length)return 0;let best=match(i+1,used);for(let j=0;j<s.length;j++)if(!(used&(1<<j))&&s[j]>=a[i])best=Math.max(best,1+match(i+1,used|(1<<j)));return best;};if(happyChildren(Object.freeze(a),Object.freeze(s))!==match(0,0))return false;}return true;})()", expected: true },
      { call: "[happyChildren(Object.freeze(Array(2000).fill(0)),Object.freeze(Array(2000).fill(-0))),happyChildren(Object.freeze(Array(2000).fill(1000000000)),Object.freeze(Array(1999).fill(1000000000))),happyChildren(Object.freeze([0]),Object.freeze([])),happyChildren(Object.freeze([]),Object.freeze([0]))]", expected: [2000, 1999, 0, 0] },

      { call: 'happyChildren([3, 1], [1, 100])', expected: 2 },
      { call: 'happyChildren([5, 10, 20], [9, 1, 100, 30])', expected: 3 },
      { call: 'happyChildren([2, 2, 2], [2, 2])', expected: 2 },
      { call: '(() => { const appetites = [3, 1, 2]; const snacks = [2, 3, 1]; happyChildren(appetites, snacks); return [appetites, snacks]; })()', expected: [[3, 1, 2], [2, 3, 1]] },
      { call: 'happyChildren([1, 2, 3], [3, 1])', expected: 2 },
    ],
  },

  /* ── recursion ─────────────────────────────────────────────────────── */
  'alg-easy2-greatest-common-divisor': {
    solution: `const gcd = (a, b) => {
  // Base case: nothing left to divide by, so a is the answer.
  if (b === 0) return a;
  // a % b is smaller than b, so each call moves closer to the base case.
  return gcd(b, a % b);
};`,
    junior: `const gcd = (a, b) => {
  if (b === 0) {
    return a;
  }
  const remainder = a % b;
  return gcd(b, remainder);
};`,
    senior: `const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));`,
    hiddenTests: [
      { call: "(() => {for(let a=0;a<=50;a++)for(let b=0;b<=50;b++){let wanted=0;for(let divisor=Math.max(a,b);divisor>=1;divisor--)if(a%divisor===0&&b%divisor===0){wanted=divisor;break;}if(gcd(a,b)!==wanted)return false;}return true;})()", expected: true },
      { call: "(() => {const pairs=[[Number.MAX_SAFE_INTEGER,0],[0,Number.MAX_SAFE_INTEGER],[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER-2],[8944394323791464,5527939700884757],[4294967296,2147483648],[9007199254740990,4503599627370495],[Number.MAX_SAFE_INTEGER,3]];for(const [a,b]of pairs){let x=BigInt(a),y=BigInt(b);while(y!==0n){const next=x%y;x=y;y=next;}const actual=gcd(a,b);if(!Number.isSafeInteger(actual)||actual<0||BigInt(actual)!==x)return false;}return true;})()", expected: true },
      { call: "[gcd(-0,0)===0,gcd(0,-0)===0,gcd(0,9),gcd(9,0),gcd(12,12),gcd(17,19),gcd(48,18),gcd(18,48)]", expected: [true, true, 9, 9, 12, 1, 6, 6] },

      { call: 'gcd(0, 9)', expected: 9 },
      { call: 'gcd(1071, 462)', expected: 21 },
      { call: 'gcd(270, 192)', expected: 6 },
      { call: 'gcd(12, 12)', expected: 12 },
    ],
  },
  'alg-easy2-fibonacci-memo': {
    solution: `const fib = (n, memo = new Map()) => {
  if (n < 2) return n;
  // Each n is worked out once; every later call reads the stored answer.
  if (memo.has(n)) return memo.get(n);
  const answer = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, answer);
  return answer;
};`,
    junior: `const fib = (n, memo = new Map()) => {
  if (n === 0) {
    return 0;
  }
  if (n === 1) {
    return 1;
  }
  if (memo.has(n)) {
    return memo.get(n);
  }
  const previous = fib(n - 1, memo);
  const beforeThat = fib(n - 2, memo);
  memo.set(n, previous + beforeThat);
  return memo.get(n);
};`,
    senior: `const fib = (n, memo = new Map()) => {
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fib(n - 1, memo) + fib(n - 2, memo));
  return memo.get(n);
};`,
    hiddenTests: [
      { call: "(() => {let a=0n,b=1n;for(let n=0;n<=78;n++){const expected=Number(a),memo=new Map();if(fib(n)!==expected||fib(n,memo)!==expected)return false;if(n>=2&&memo.get(n)!==expected)return false;const size=memo.size;if(fib(n,memo)!==expected||memo.size!==size)return false;[a,b]=[b,a+b];}return fib(-0)===0;})()", expected: true },
      { call: "(() => {for(const seed of [0,-5,.5,100,NaN,Infinity,-Infinity,-0]){const marker=Symbol(\"note\"),key={},memo=new Map([[5,seed],[0,999],[1,888],[\"note\",marker],[key,marker]]);if(!Object.is(fib(6,memo),seed+3)||!Object.is(memo.get(5),seed)||memo.get(0)!==999||memo.get(1)!==888||memo.get(\"note\")!==marker||memo.get(key)!==marker||fib(0,memo)!==0||fib(1,memo)!==1)return false;}return Object.is(fib(6,new Map([[6,-0]])),-0);})()", expected: true },
      { call: "(() => {const memo=new Map([[12,-7],[\"keep\",undefined]]),before=[...memo];const hit=fib(12,memo);return [hit,memo.size,memo.get(\"keep\")===undefined,memo.has(\"keep\"),[...memo].every(([k,v],i)=>k===before[i][0]&&Object.is(v,before[i][1])),fib(78),fib(0),fib(1)];})()", expected: [-7, 2, true, true, true, 8944394323791464, 0, 1] },

      { call: 'fib(70)', expected: 190392490709135 },
      { call: 'fib(78)', expected: 8944394323791464 },
      { call: 'fib(2)', expected: 1 },
      { call: '(() => { const memo = new Map([[5, 100]]); return fib(6, memo); })()', expected: 103 },
    ],
  },
  'alg-easy2-binary-strings': {
    solution: `const binaryStrings = n => {
  // One string has length 0: the empty string.
  if (n === 0) return [""];
  const shorter = binaryStrings(n - 1);
  // The "0" strings first keeps the list in counting order.
  return [...shorter.map((rest) => "0" + rest), ...shorter.map((rest) => "1" + rest)];
};`,
    junior: `const binaryStrings = n => {
  if (n === 0) {
    return [""];
  }
  const shorter = binaryStrings(n - 1);
  const result = [];
  for (let i = 0; i < shorter.length; i++) {
    result.push("0" + shorter[i]);
  }
  for (let i = 0; i < shorter.length; i++) {
    result.push("1" + shorter[i]);
  }
  return result;
};`,
    senior: `const binaryStrings = (n, prefix = "") =>
  prefix.length === n
    ? [prefix]
    : [...binaryStrings(n, prefix + "0"), ...binaryStrings(n, prefix + "1")];`,
    hiddenTests: [
      { call: "(() => {for(let n=0;n<=12;n++){const out=binaryStrings(n);if(out.length!==2**n)return false;for(let index=0;index<out.length;index++){const wanted=n===0?\"\":index.toString(2).padStart(n,\"0\");if(out[index]!==wanted)return false;}}return true;})()", expected: true },
      { call: "(() => {const first=binaryStrings(3),second=binaryStrings(3);if(first===second)return false;first.pop();return [first.length,second.length,binaryStrings(3).length,binaryStrings(0)[0],binaryStrings(-0)[0],binaryStrings(0)!==binaryStrings(0)];})()", expected: [7, 8, 8, "", "", true] },
      { call: "(() => {const out=binaryStrings(12);return [new Set(out).size,out[0],out[2048],out[4095],out.every(text=>typeof text===\"string\"&&text.length===12&&/^[01]+$/.test(text))];})()", expected: [4096, "000000000000", "100000000000", "111111111111", true] },

      { call: 'binaryStrings(4)', expected: ['0000', '0001', '0010', '0011', '0100', '0101', '0110', '0111', '1000', '1001', '1010', '1011', '1100', '1101', '1110', '1111'] },
      { call: 'binaryStrings(5)[21]', expected: '10101' },
      { call: 'binaryStrings(10).length', expected: 1024 },
      { call: 'binaryStrings(6).every(text => text.length === 6 && /^[01]+$/.test(text))', expected: true },
    ],
  },
  'alg-easy2-mirror-tree': {
    solution: `const mirror = root => {
  // An empty subtree mirrors to an empty subtree; this ends each branch.
  if (root === null) return null;
  // A new node, so the caller's tree stays as it was.
  return {
    value: root.value,
    left: mirror(root.right),
    right: mirror(root.left),
  };
};`,
    junior: `const mirror = root => {
  if (root === null) {
    return null;
  }
  const newLeft = mirror(root.right);
  const newRight = mirror(root.left);
  const copy = { value: root.value, left: newLeft, right: newRight };
  return copy;
};`,
    senior: `const mirror = (root) =>
  root && { value: root.value, left: mirror(root.right), right: mirror(root.left) };`,
    hiddenTests: [
      { call: "(() => {const memo=[[null]],shapes=n=>{if(memo[n])return memo[n];const out=[];for(let k=0;k<n;k++)for(const a of shapes(k))for(const b of shapes(n-k-1))out.push([a,b]);return memo[n]=out;};for(let n=0;n<=5;n++)for(const shape of shapes(n)){const make=s=>s===null?null:Object.freeze(Object.assign(Object.create(null),{value:Object.freeze({token:Symbol(\"value\")}),left:make(s[0]),right:make(s[1])}));const original=make(shape),source=new Map(),copied=new Map(),collect=(node,path,out)=>{if(node===null)return true;if(typeof node!==\"object\"||[...out.values()].includes(node))return false;out.set(path,node);return collect(node.left,path+\"L\",out)&&collect(node.right,path+\"R\",out);};if(!collect(original,\"\",source)||!collect(mirror(original),\"\",copied)||source.size!==copied.size)return false;const originals=new Set(source.values());for(const [path,node]of copied){const counterpart=source.get(path.replace(/[LR]/g,c=>c===\"L\"?\"R\":\"L\"));if(!counterpart||originals.has(node)||!Object.is(node.value,counterpart.value)||![\"value\",\"left\",\"right\"].every(key=>Object.hasOwn(node,key)))return false;}}return true;})()", expected: true },
      { call: "(() => {const token=Symbol(\"payload\");let root=null;for(let i=127;i>=0;i--)root=Object.freeze({value:i%3===0?undefined:i%3===1?token:-0,left:root,right:null});const originals=new Set();for(let node=root;node;node=node.left)originals.add(node);const out=mirror(root);let a=root,b=out,count=0;while(a){if(!b||originals.has(b)||!Object.is(a.value,b.value)||b.left!==null)return false;a=a.left;b=b.right;count++;}if(b!==null||count!==128)return false;out.value=99;return root.value===undefined&&mirror(null)===null;})()", expected: true },
      { call: "(() => {const build=(lo,hi)=>{if(lo>=hi)return null;const mid=Math.floor((lo+hi)/2);return Object.freeze({value:Object.freeze({id:mid}),left:build(lo,mid),right:build(mid+1,hi)});};const root=build(0,2000),a=mirror(root),b=mirror(root),originals=new Set(),outputs=new Set(),stack=[[root,a,b]];let count=0;while(stack.length){const [source,one,two]=stack.pop();if(source===null){if(one!==null||two!==null)return false;continue;}originals.add(source);if(!one||!two||one===two||outputs.has(one)||outputs.has(two)||one.value!==source.value||two.value!==source.value)return false;outputs.add(one);outputs.add(two);stack.push([source.left,one.right,two.right],[source.right,one.left,two.left]);count++;}return count===2000&&[...outputs].every(node=>!originals.has(node));})()", expected: true },

      { call: withTree('(() => { const original = node(1, node(2, node(4)), node(3)); mirror(original); return original; })()'), expected: tree(1, tree(2, tree(4)), tree(3)) },
      { call: withTree('(() => { const original = node(1, node(2), node(3)); const copy = mirror(original); return copy !== original && copy.left !== original.right && copy.right !== original.left; })()'), expected: true },
      { call: withTree('mirror(mirror(node(8, node(3, null, node(6)), node(10, node(9)))))'), expected: tree(8, tree(3, null, tree(6)), tree(10, tree(9))) },
      { call: withTree('mirror(node(0, node(0)))'), expected: tree(0, null, tree(0)) },
    ],
  },
  'alg-easy2-path-sum': {
    solution: `const hasPathSum = (root, target) => {
  if (root === null) return false;
  const rest = target - root.value;
  // Decide at a leaf; a null child would end a path halfway down.
  if (root.left === null && root.right === null) return rest === 0;
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
};`,
    junior: `const hasPathSum = (root, target) => {
  if (root === null) {
    return false;
  }
  const isLeaf = root.left === null && root.right === null;
  if (isLeaf) {
    return root.value === target;
  }
  const rest = target - root.value;
  if (hasPathSum(root.left, rest)) {
    return true;
  }
  if (hasPathSum(root.right, rest)) {
    return true;
  }
  return false;
};`,
    senior: `const hasPathSum = (root, target) => {
  if (!root) return false;
  const rest = target - root.value;
  return !root.left && !root.right
    ? rest === 0
    : hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
};`,
    hiddenTests: [
      { call: "(() => {const make=(value,left=null,right=null)=>Object.freeze(Object.assign(Object.create(null),{value,left,right}));return [hasPathSum(make(1000000000,null,make(1000000000,null,make(1000000000))),3000000000),hasPathSum(make(1000000000,make(-1000000000)),0),hasPathSum(make(0,make(1)),0),hasPathSum(make(-0),0),hasPathSum(null,0)];})()", expected: [true, true, false, true, false] },
      { call: "(() => {const memo=[[null]],shapes=n=>{if(memo[n])return memo[n];const found=[];for(let k=0;k<n;k++)for(const a of shapes(k))for(const b of shapes(n-k-1))found.push([a,b]);return memo[n]=found;};for(let n=0;n<=4;n++)for(const shape of shapes(n))for(let code=0;code<3**n;code++){let digits=code;const make=s=>{if(s===null)return null;const value=[-1,0,2][digits%3];digits=Math.floor(digits/3);return Object.freeze({value,left:make(s[0]),right:make(s[1])});},root=make(shape),sums=new Set(),walk=(node,total)=>{if(node===null)return;const sum=total+node.value;if(node.left===null&&node.right===null)sums.add(sum);else{walk(node.left,sum);walk(node.right,sum);}};walk(root,0);for(let target=-4;target<=8;target++)if(hasPathSum(root,target)!==sums.has(target))return false;}return true;})()", expected: true },
      { call: "(() => {let root=null;for(let i=0;i<128;i++)root=Object.freeze({value:1000000000,left:root,right:null});const build=(lo,hi)=>{if(lo>=hi)return null;const mid=Math.floor((lo+hi)/2);return Object.freeze({value:1,left:build(lo,mid),right:build(mid+1,hi)});};return [hasPathSum(root,128000000000),hasPathSum(root,127000000000),hasPathSum(build(0,2000),1000000000000),hasPathSum(root,128000000000)];})()", expected: [true, false, false, true] },

      { call: withTree('hasPathSum(node(-2, null, node(-3)), -5)'), expected: true },
      { call: withTree('hasPathSum(node(7), 7)'), expected: true },
      { call: withTree('hasPathSum(node(1, node(2), node(3)), 6)'), expected: false },
      { call: withTree('hasPathSum(node(1, node(2), node(3)), 4)'), expected: true },
      { call: withTree('hasPathSum(node(0, node(1), node(1)), 1)'), expected: true },
    ],
  },
};
