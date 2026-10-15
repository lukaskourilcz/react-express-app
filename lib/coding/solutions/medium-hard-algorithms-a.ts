// Server-only reference solutions and hidden tests for
// lib/coding/tasks/medium-hard-algorithms-a.ts. Never import from client code.
// The hidden tests aim at the shortcut each visible set leaves open: the
// technique the task combines, a value or shape the visible checks never used,
// and the case a plausible wrong answer gets wrong. Where the cost is the
// point, one hidden check is large enough that the brute force runs out of the
// grader's 2.5-second budget, or it counts the reads.

import type { CodingSolution } from '../types';
import { tree, withList, withTree } from '../tasks/easy-algorithms-a';

const LIST_VALUES = 'const values = node => { const out = []; for (; node; node = node.next) out.push(node.value); return out; };';

const countedSearch = (n: number, cut: number, target: number): string =>
  `(() => { const base = Array.from({ length: ${n} }, (_, i) => ((i + ${cut}) % ${n}) * 3); let reads = 0; const values = new __probe.Proxy(base, { get(list, key, receiver) { if (__probe.isIndex(key)) reads++; return __probe.get(list, key, receiver); } }); return [findRotated(values, ${target}), reads <= 200]; })()`;

const GRID_TRACKS = 'const tracks = []; for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { if (c < 9) tracks.push([r + ":" + c, r + ":" + (c + 1), (r * 7 + c * 13) % 9 + 1]); if (r < 9) tracks.push([r + ":" + c, (r + 1) + ":" + c, (r * 11 + c * 5) % 9 + 1]); }';

export const MEDIUM_HARD_ALGORITHMS_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── Medium: sorting and pointers ─────────────────────────────────── */
  'alg-mh-three-sum': {
    solution: `const threeSum = numbers => {
  // A sorted copy: compared as numbers, and the caller's list left alone.
  const sorted = [...numbers].sort((a, b) => a - b);
  const triples = [];
  for (let first = 0; first < sorted.length - 2; first++) {
    // Every triple that starts with this value was found at its first copy.
    if (first > 0 && sorted[first] === sorted[first - 1]) continue;
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[first] + sorted[left] + sorted[right];
      if (sum < 0) left++; // only a larger value on the left can raise the sum
      else if (sum > 0) right--; // only a smaller value on the right can lower it
      else {
        triples.push([sorted[first], sorted[left], sorted[right]]);
        // Step past every repeat, so the same values are not recorded twice.
        while (left < right && sorted[left] === sorted[left + 1]) left++;
        while (left < right && sorted[right] === sorted[right - 1]) right--;
        left++;
        right--;
      }
    }
  }
  return triples;
};`,
    junior: `const threeSum = numbers => {
  const sorted = [];
  for (const number of numbers) {
    sorted.push(number);
  }
  sorted.sort((a, b) => a - b);
  const triples = [];
  for (let first = 0; first < sorted.length - 2; first++) {
    const firstValue = sorted[first];
    if (first > 0 && firstValue === sorted[first - 1]) {
      continue;
    }
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const leftValue = sorted[left];
      const rightValue = sorted[right];
      const sum = firstValue + leftValue + rightValue;
      if (sum < 0) {
        left = left + 1;
      } else if (sum > 0) {
        right = right - 1;
      } else {
        triples.push([firstValue, leftValue, rightValue]);
        while (left < right && sorted[left] === leftValue) {
          left = left + 1;
        }
        while (left < right && sorted[right] === rightValue) {
          right = right - 1;
        }
      }
    }
  }
  return triples;
};`,
    senior: `const threeSum = numbers => {
  const sorted = numbers.toSorted((a, b) => a - b);
  const triples = [];
  // Once the first value is above 0, three of them cannot add up to 0.
  for (let first = 0; first < sorted.length - 2 && sorted[first] <= 0; first++) {
    if (sorted[first] === sorted[first - 1]) continue; // sorted[-1] is undefined
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[first] + sorted[left] + sorted[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        triples.push([sorted[first], sorted[left++], sorted[right--]]);
        // A repeat on the right is skipped by the sum itself: it is now too big.
        while (left < right && sorted[left] === sorted[left - 1]) left++;
      }
    }
  }
  return triples;
};`,
    hiddenTests: [
      { call: "(() => {const input=Object.freeze([-4294967296,0,4294967296,-4294967296,0,4294967296]);const a=threeSum(input),b=threeSum(input);const values=a.map(t=>t.slice());a[0].push(9);a.push([]);return [values,a!==b,b,b[0].length,input.length,threeSum(Object.freeze([]))];})()", expected: [[[-4294967296, 0, 4294967296]], true, [[-4294967296, 0, 4294967296]], 3, 6, []] },
      { call: "(() => {for(let n=0;n<=4;n++){for(let code=0;code<Math.pow(5,n);code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(digits%5-2);digits=Math.floor(digits/5);}const unique=new Map();for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)if(values[i]+values[j]+values[k]===0){const t=[values[i],values[j],values[k]].sort((a,b)=>a-b);unique.set(t.join(\",\"),t);}const wanted=[...unique.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(JSON.stringify(threeSum(Object.freeze(values)))!==JSON.stringify(wanted))return false;}}return true;})()", expected: true },
      { call: "(() => {const input=[3,0,-2,-1,1,2],before=input.slice();const out=threeSum(input),again=threeSum(input);const count=out.length;const separate=out.every((t,i)=>out.every((other,j)=>i===j||t!==other));if(count)out[0][0]=99;const empty=threeSum([1,2]),empty2=threeSum([1,2]);empty.push([]);return [input.every((v,i)=>v===before[i]),separate,again.length,again[0][0],empty2.length,threeSum([-0,0,0]).length];})()", expected: [true, true, 3, -2, 0, 1] },

      { call: 'threeSum([3, 0, -2, -1, 1, 2])', expected: [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]] },
      { call: 'threeSum([-1, -1, -1, 2, 2, 2])', expected: [[-1, -1, 2]] },
      { call: 'threeSum([1, -1, 0])', expected: [[-1, 0, 1]] },
      { call: 'threeSum([5, -5, 0, 5, -5])', expected: [[-5, 0, 5]] },
      { call: 'threeSum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6])', expected: [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]] },
      { call: 'threeSum(Array.from({ length: 300 }, (_, i) => (i % 7) - 3))', expected: [[-3, 0, 3], [-3, 1, 2], [-2, -1, 3], [-2, 0, 2], [-2, 1, 1], [-1, -1, 2], [-1, 0, 1], [0, 0, 0]] },
      { call: '(() => { const found = threeSum(Array.from({ length: 800 }, (_, i) => (i * i * 7919 + i * 31) % 100003 - 50001)); return [found.length, found[0], found[found.length - 1]]; })()', expected: [581, [-50001, 1543, 48458], [-1112, -579, 1691]] },
    ],
  },
  'alg-mh-meeting-rooms': {
    solution: `const roomsNeeded = meetings => {
  // map makes new arrays, so sorting them leaves meetings alone.
  const starts = meetings.map(([start]) => start).sort((a, b) => a - b);
  const ends = meetings.map(([, end]) => end).sort((a, b) => a - b);
  let rooms = 0;
  let ended = 0; // how many of the sorted ends have passed
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[ended]) {
      rooms++; // nothing has finished yet: one more room
    } else {
      ended++; // the earliest meeting still running is over; take its room
    }
  }
  return rooms;
};`,
    junior: `const roomsNeeded = meetings => {
  const starts = [];
  const ends = [];
  for (const meeting of meetings) {
    starts.push(meeting[0]);
    ends.push(meeting[1]);
  }
  starts.sort((a, b) => a - b);
  ends.sort((a, b) => a - b);
  let rooms = 0;
  let endIndex = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[endIndex]) {
      rooms = rooms + 1;
    } else {
      endIndex = endIndex + 1;
    }
  }
  return rooms;
};`,
    senior: `const roomsNeeded = meetings => {
  // One event per start (+1) and per end (-1). At the same minute an end sorts
  // first, so a room frees up before the next meeting takes it.
  const events = meetings
    .flatMap(([start, end]) => [[start, 1], [end, -1]])
    .sort(([timeA, changeA], [timeB, changeB]) => timeA - timeB || changeA - changeB);
  let inUse = 0;
  let most = 0;
  for (const [, change] of events) {
    inUse += change;
    most = Math.max(most, inUse);
  }
  return most;
};`,
    hiddenTests: [
      { call: "(() => {const input=[[0,.5],[.25,.75],[1,1]],copy=input.map(pair=>pair.slice());const a=roomsNeeded(input);return [a,input.every((pair,i)=>pair.every((v,j)=>Object.is(v,copy[i][j]))),roomsNeeded(Object.freeze([Object.freeze([0,.5]),Object.freeze([.5,1])])),roomsNeeded(Object.freeze([Object.freeze([1,1]),Object.freeze([2,2])]))];})()", expected: [2, true, 1, 0] },
      { call: "(() => {const intervals=[[0,0],[0,1],[0,2],[1,1],[1,2],[2,2]];for(let n=0;n<=4;n++){for(let code=0;code<Math.pow(6,n);code++){let digits=code;const meetings=[];for(let i=0;i<n;i++){meetings.push(Object.freeze(intervals[digits%6].slice()));digits=Math.floor(digits/6);}let wanted=0;for(const [time]of meetings){let count=0;for(const [start,end]of meetings)if(start<=time&&time<end)count++;wanted=Math.max(wanted,count);}if(roomsNeeded(Object.freeze(meetings))!==wanted)return false;}}return true;})()", expected: true },
      { call: "[roomsNeeded(Object.freeze(Array.from({length:2000},()=>Object.freeze([0,1440])))),roomsNeeded(Object.freeze(Array.from({length:1440},(_,i)=>Object.freeze([i,i+1])))),roomsNeeded(Object.freeze([])),roomsNeeded([[1,1],[0,1440],[1,2]])]", expected: [2000, 1, 0, 2] },

      { call: 'roomsNeeded([[5, 9], [9, 12], [10, 15]])', expected: 2 },
      { call: 'roomsNeeded([[1, 3], [2, 5], [4, 6]])', expected: 2 },
      { call: 'roomsNeeded([[0, 5], [0, 5], [0, 5]])', expected: 3 },
      { call: 'roomsNeeded([[1, 2], [2, 3], [3, 4], [1, 4]])', expected: 2 },
      { call: 'roomsNeeded([[100, 200], [30, 150], [90, 110], [150, 160]])', expected: 3 },
      { call: 'roomsNeeded([[3, 4]])', expected: 1 },
      { call: 'roomsNeeded(Array.from({ length: 1000 }, (_, i) => [(i * 37) % 600, (i * 37) % 600 + 30 + (i % 50)]))', expected: 95 },
    ],
  },
  'alg-mh-rotated-search': {
    solution: `const findRotated = (values, target) => {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = values[middle];
    if (value === target) return middle;
    const first = values[low];
    if (first <= value) {
      // low..middle is in order, so the target is there only if it lies between its ends.
      if (first <= target && target < value) high = middle - 1;
      else low = middle + 1;
    } else {
      // The break is on the left, so middle..high is the half in order.
      const last = values[high];
      if (value < target && target <= last) low = middle + 1;
      else high = middle - 1;
    }
  }
  return -1;
};`,
    junior: `const findRotated = (values, target) => {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] === target) {
      return middle;
    }
    const leftHalfInOrder = values[low] <= values[middle];
    if (leftHalfInOrder) {
      const insideLeft = values[low] <= target && target < values[middle];
      if (insideLeft) {
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    } else {
      const insideRight = values[middle] < target && target <= values[high];
      if (insideRight) {
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
  }
  return -1;
};`,
    senior: `const findRotated = (values, target) => {
  const count = values.length;
  // First find where the smallest value sits: the point the list was cut.
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] > values[high]) low = middle + 1;
    else high = middle;
  }
  const shift = low;
  // Then search positions 0..count-1 of the sorted order, mapped onto the rotation.
  for (let from = 0, to = count - 1; from <= to; ) {
    const middle = (from + to) >> 1;
    const index = (middle + shift) % count;
    const value = values[index];
    if (value === target) return index;
    if (value < target) from = middle + 1;
    else to = middle - 1;
  }
  return -1;
};`,
    hiddenTests: [
      { call: "(() => {const values=[3.5,5.25,-2.5,0,1.25],copy=values.slice();return [findRotated(values,1.25),values.every((v,i)=>Object.is(v,copy[i])),findRotated(Object.freeze([-0]),0),findRotated(Object.freeze([0]),-0),findRotated(Object.freeze([Number.MIN_VALUE,1,-1,0]),Number.MIN_VALUE),findRotated(Object.freeze([]),0)];})()", expected: [4, true, 0, 0, 0, -1] },
      { call: "(() => {for(let n=0;n<=16;n++){const sorted=Array.from({length:n},(_,i)=>i*2-16);for(let shift=0;shift<Math.max(1,n);shift++){const values=Object.freeze(sorted.slice(shift).concat(sorted.slice(0,shift)));for(const target of [...sorted,-17,n*2-15])if(findRotated(values,target)!==values.indexOf(target))return false;}}return true;})()", expected: true },
      { call: "(() => {const base=Object.freeze(Array.from({length:65536},(_,i)=>((i+40000)%65536)*.5-20000));let reads=0;const values=new __probe.Proxy(base,{get(list,key,receiver){if(__probe.isIndex(key)){reads++;if(reads>200)throw Error(\"read budget or bounds\");}return __probe.get(list,key,receiver);}});for(const [target,index]of [[-20000,25536],[12767.5,25535],[0,0],[.25,-1]]){reads=0;if(findRotated(values,target)!==index||reads>200)return false;}return true;})()", expected: true },

      { call: 'findRotated([5, 1, 3], 5)', expected: 0 },
      { call: 'findRotated([5, 1, 3], 3)', expected: 2 },
      { call: 'findRotated([3, 1], 1)', expected: 1 },
      { call: 'findRotated([6, 7, 8, 1, 2, 3, 4, 5], 8)', expected: 2 },
      { call: 'findRotated([6, 7, 8, 1, 2, 3, 4, 5], 1)', expected: 3 },
      { call: 'findRotated([-9, -4, 0, 3, -20, -15], -15)', expected: 5 },
      { call: 'findRotated([2, 4], 3)', expected: -1 },
      { call: countedSearch(65536, 40000, 1), expected: [-1, true] },
      { call: countedSearch(65536, 0, 196605), expected: [65535, true] },
    ],
  },
  'alg-mh-nth-from-end': {
    solution: `const removeFromEnd = (head, n) => {
  // A placeholder in front of the head gives the head a node before it too.
  const placeholder = { value: null, next: head };
  let lead = placeholder;
  let trail = placeholder;
  for (let step = 0; step < n; step++) lead = lead.next;
  // Keep the gap of n nodes until lead is on the last node.
  while (lead.next) {
    lead = lead.next;
    trail = trail.next;
  }
  trail.next = trail.next.next; // unlink the nth node from the end
  return placeholder.next;
};`,
    junior: `const removeFromEnd = (head, n) => {
  let length = 0;
  let current = head;
  while (current !== null) {
    length = length + 1;
    current = current.next;
  }
  const position = length - n;
  if (position === 0) {
    return head.next;
  }
  let before = head;
  let index = 1;
  while (index < position) {
    before = before.next;
    index = index + 1;
  }
  before.next = before.next.next;
  return head;
};`,
    senior: `const removeFromEnd = (head, n) => {
  let lead = head;
  for (let i = 0; i < n; i++) lead = lead.next;
  if (lead === null) return head.next; // n is the length: the head is the node to go
  let trail = head;
  while (lead.next) [lead, trail] = [lead.next, trail.next];
  trail.next = trail.next.next;
  return head;
};`,
    hiddenTests: [
      { call: "(() => {for(let length=1;length<=24;length++)for(let n=1;n<=length;n++){const payload=Object.freeze({token:Symbol(\"payload\")}),nodes=[];for(let i=0;i<length;i++)nodes.push(Object.assign(Object.create(null),{value:i%3===0?payload:i%3===1?undefined:NaN,next:null}));for(let i=0;i<length-1;i++)nodes[i].next=nodes[i+1];const old=nodes.map(node=>[node.value,node.next]),removed=length-n,result=removeFromEnd(nodes[0],n);if(result!==(removed===0?(nodes[1]??null):nodes[0]))return false;for(let i=0;i<length;i++){const wanted=i===removed-1?(nodes[i+2]??null):old[i][1];if(nodes[i].next!==wanted||!Object.is(nodes[i].value,old[i][0]))return false;}}return true;})()", expected: true },
      { call: "(() => {for(const n of [1,2500,5000]){const nodes=Array.from({length:5000},()=>({value:Symbol(\"node\"),next:null}));for(let i=0;i<4999;i++)nodes[i].next=nodes[i+1];const removed=5000-n,result=removeFromEnd(nodes[0],n);if(result!==(removed===0?nodes[1]:nodes[0]))return false;for(let i=0;i<5000;i++)if(nodes[i].next!==(i===removed-1?(nodes[i+2]??null):(nodes[i+1]??null)))return false;}return true;})()", expected: true },
      { call: "(() => {const tail={value:null,next:null},removed={value:undefined,next:tail},head={value:NaN,next:removed};return [removeFromEnd(head,2)===head,head.next===tail,removed.next===tail,Number.isNaN(head.value),removeFromEnd({value:Symbol(\"only\"),next:null},1)===null];})()", expected: [true, true, true, true, true] },

      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(10, 20, 30, 40), 4));`), expected: [20, 30, 40] },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(0, 0, 0), 2));`), expected: [0, 0] },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 7));`), expected: [1, 2, 3, 5, 6, 7, 8, 9, 10] },
      { call: withList('const head = list(1, 2); const result = removeFromEnd(head, 1); return [result === head, head.next];'), expected: [true, null] },
      { call: withList('const head = list(5, 6, 7); const second = head.next; return removeFromEnd(head, 3) === second;'), expected: true },
      { call: withList(`${LIST_VALUES} const kept = values(removeFromEnd(list(...Array.from({ length: 5000 }, (_, i) => i)), 2500)); return [kept.length, kept[2499], kept[2500]];`), expected: [4999, 2499, 2501] },
    ],
  },
  /* ── Medium: hash maps and running totals ─────────────────────────── */
  'alg-mh-subarray-sum': {
    solution: `const countStretches = (amounts, target) => {
  // Running total -> how many times it has come up. 0 stands for "before the first amount".
  const seen = new Map([[0, 1]]);
  let total = 0;
  let count = 0;
  for (const amount of amounts) {
    total += amount;
    // Every earlier total equal to total - target starts a stretch that ends here.
    count += seen.get(total - target) ?? 0;
    seen.set(total, (seen.get(total) ?? 0) + 1);
  }
  return count;
};`,
    junior: `const countStretches = (amounts, target) => {
  const seen = new Map();
  seen.set(0, 1);
  let total = 0;
  let count = 0;
  for (const amount of amounts) {
    total = total + amount;
    const wanted = total - target;
    if (seen.has(wanted)) {
      count = count + seen.get(wanted);
    }
    if (seen.has(total)) {
      seen.set(total, seen.get(total) + 1);
    } else {
      seen.set(total, 1);
    }
  }
  return count;
};`,
    senior: `const countStretches = (amounts, target) => {
  const seen = new Map([[0, 1]]);
  let total = 0;
  return amounts.reduce((count, amount) => {
    total += amount;
    const endingHere = seen.get(total - target) ?? 0; // read before this total is recorded
    seen.set(total, (seen.get(total) ?? 0) + 1);
    return count + endingHere;
  }, 0);
};`,
    hiddenTests: [
      { call: "(() => {const input=[1000000000,1000000000,1000000000,1000000000,294967296],copy=input.slice();const result=countStretches(input,0);return [result,input.every((v,i)=>v===copy[i]),countStretches(Object.freeze(input),4294967296),countStretches(Object.freeze([1,-1,1,-1]),0),countStretches(Object.freeze([]),0)];})()", expected: [0, true, 1, 4, 0] },
      { call: "(() => {for(let n=0;n<=5;n++){for(let code=0;code<Math.pow(3,n);code++){let digits=code;const amounts=[];for(let i=0;i<n;i++){amounts.push(digits%3-1);digits=Math.floor(digits/3);}for(let target=-2;target<=2;target++){let wanted=0;for(let start=0;start<n;start++){let total=0;for(let end=start;end<n;end++){total+=amounts[end];if(total===target)wanted++;}}if(countStretches(Object.freeze(amounts),target)!==wanted)return false;}}}return true;})()", expected: true },
      { call: "[countStretches(Object.freeze(Array(20000).fill(0)),0),countStretches(Object.freeze(Array(20000).fill(1000000000)),20000000000000),countStretches(Object.freeze([-1000000000,-1000000000]),-2000000000),countStretches([0,0],0),countStretches([1],0)]", expected: [200010000, 1, 1, 3, 0] },

      { call: 'countStretches([2, -2, 2, -2, 2], 2)', expected: 6 },
      { call: 'countStretches([-1, -1, 1], 0)', expected: 1 },
      { call: 'countStretches([1, 2, 3], 7)', expected: 0 },
      { call: 'countStretches([10, 2, -2, -20, 10], -10)', expected: 3 },
      { call: 'countStretches(Array.from({ length: 20000 }, (_, i) => (i % 7) - 3), 0)', expected: 53054490 },
      { call: 'countStretches(Array.from({ length: 20000 }, (_, i) => ((i * 37) % 11) - 5), 4)', expected: 9917190 },
    ],
  },
  /* ── Medium: recursion ────────────────────────────────────────────── */
  'alg-mh-balanced-brackets': {
    solution: `const balanced = pairs => {
  const found = [];
  const path = [];
  const build = (opened, closed) => {
    if (closed === pairs) {
      found.push(path.join(""));
      return;
    }
    if (opened < pairs) {
      path.push("(");
      build(opened + 1, closed);
      path.pop();
    }
    if (closed < opened) {
      path.push(")");
      build(opened, closed + 1);
      path.pop();
    }
  };
  build(0, 0);
  return found;
};`,
    junior: `const balanced = pairs => {
  const found = [];
  const current = [];
  const build = (opened, closed) => {
    if (opened === pairs && closed === pairs) {
      found.push(current.join(""));
      return;
    }
    if (opened < pairs) {
      current.push("(");
      build(opened + 1, closed);
      current.pop();
    }
    if (closed < opened) {
      current.push(")");
      build(opened, closed + 1);
      current.pop();
    }
  };
  build(0, 0);
  return found;
};`,
    senior: `const balanced = pairs => {
  const found = [];
  const path = [];
  const frames = [{ opened: 0, closed: 0, branch: 0 }];
  while (frames.length) {
    const frame = frames[frames.length - 1];
    path.length = frame.opened + frame.closed;
    if (frame.closed === pairs) {
      found.push(path.join(""));
      frames.pop();
    } else if (frame.branch === 0) {
      frame.branch = 1;
      if (frame.opened < pairs) {
        path.push("(");
        frames.push({ opened: frame.opened + 1, closed: frame.closed, branch: 0 });
      }
    } else if (frame.branch === 1) {
      frame.branch = 2;
      if (frame.closed < frame.opened) {
        path.push(")");
        frames.push({ opened: frame.opened, closed: frame.closed + 1, branch: 0 });
      }
    } else frames.pop();
  }
  return found;
};`,
    hiddenTests: [
      { call: "(() => {for(let n=0;n<=6;n++){const wanted=[];for(let bits=0;bits<2**(2*n);bits++){let text=\"\",balance=0,valid=true;for(let i=2*n-1;i>=0;i--){if((bits>>i)&1){text+=\")\";balance--;}else{text+=\"(\";balance++;}if(balance<0)valid=false;}if(valid&&balance===0)wanted.push(text);}const got=balanced(n);if(got.length!==wanted.length||got.some((text,i)=>text!==wanted[i]))return false;}return true;})()", expected: true },
      { call: "(() => {const all=balanced(11);if(all.length!==58786)return false;let previous;for(const text of all){if(typeof text!==\"string\"||text.length!==22||(previous!==undefined&&previous>=text))return false;let depth=0;for(const c of text){if(c===\"(\")depth++;else if(c===\")\")depth--;else return false;if(depth<0)return false;}if(depth!==0)return false;previous=text;}return true;})()", expected: true },
      { call: "(() => {const first=balanced(3),second=balanced(3);if(first===second)return false;first.pop();const third=balanced(3),empty=balanced(0);return [first.length,second.length,third.length,third!==first,third!==second,empty.length,empty[0]];})()", expected: [4, 5, 5, true, true, 1, ""] },

      { call: 'balanced(4)', expected: ['(((())))', '((()()))', '((())())', '((()))()', '(()(()))', '(()()())', '(()())()', '(())(())', '(())()()', '()((()))', '()(()())', '()(())()', '()()(())', '()()()()'] },
      { call: 'balanced(6).length', expected: 132 },
      { call: '(() => { const all = balanced(7); return [all.length, new Set(all).size, [...all].sort().join() === all.join()]; })()', expected: [429, 429, true] },
      { call: '(() => { const all = balanced(11); return [all.length, all[0], all[all.length - 1]]; })()', expected: [58786, '((((((((((()))))))))))', '()()()()()()()()()()()'] },
    ],
  },
  'alg-mh-check-bst': {
    solution: `const isSearchTree = root => {
  // Every node must lie strictly inside the range its ancestors set.
  const within = (node, low, high) => {
    if (node === null) return true;
    if (node.value <= low || node.value >= high) return false; // equal breaks the rule too
    // Going left lowers the ceiling to this value; going right raises the floor.
    return within(node.left, low, node.value) && within(node.right, node.value, high);
  };
  return within(root, -Infinity, Infinity);
};`,
    junior: `const isSearchTree = root => {
  let previous;
  let seen = false;
  const visit = node => {
    if (node === null) return true;
    if (!visit(node.left)) return false;
    if (seen && node.value <= previous) return false;
    previous = node.value;
    seen = true;
    return visit(node.right);
  };
  return visit(root);
};`,
    senior: `// Defaults carry the range, so the root call needs only the tree.
const isSearchTree = (node, low = -Infinity, high = Infinity) =>
  node === null ||
  (low < node.value &&
    node.value < high &&
    isSearchTree(node.left, low, node.value) &&
    isSearchTree(node.right, node.value, high));`,
    hiddenTests: [
      { call: "(() => {const make=(value,left=null,right=null)=>Object.freeze(Object.assign(Object.create(null),{value,left,right}));return [isSearchTree(make(0,make(-.5),make(.5))),isSearchTree(make(-0,null,make(0))),isSearchTree(make(-1000000000000,null,make(1000000000000))),isSearchTree(make(Number.MIN_VALUE)),isSearchTree(null)];})()", expected: [true, false, true, true, true] },
      { call: "(() => {const memo=[[null]],shapes=n=>{if(memo[n])return memo[n];const out=[];for(let k=0;k<n;k++)for(const left of shapes(k))for(const right of shapes(n-k-1))out.push([left,right]);return memo[n]=out;};const oracle=node=>{if(node===null)return true;const all=one=>one===null?[]:[one.value,...all(one.left),...all(one.right)];return all(node.left).every(v=>v<node.value)&&all(node.right).every(v=>v>node.value)&&oracle(node.left)&&oracle(node.right);};for(let n=0;n<=4;n++)for(const shape of shapes(n))for(let code=0;code<3**n;code++){let digits=code;const make=shape=>{if(shape===null)return null;const value=[-.5,0,.5][digits%3];digits=Math.floor(digits/3);return Object.freeze({value,left:make(shape[0]),right:make(shape[1])});};const root=make(shape);if(isSearchTree(root)!==oracle(root))return false;}return true;})()", expected: true },
      { call: "(() => {let chain=null;for(let i=127;i>=0;i--)chain=Object.freeze({value:i/2,left:null,right:chain});const build=(lo,hi)=>{if(lo>=hi)return null;const mid=Math.floor((lo+hi)/2);return Object.freeze({value:mid-1000,left:build(lo,mid),right:build(mid+1,hi)});};return [isSearchTree(chain),isSearchTree(build(0,2000)),isSearchTree(Object.freeze({value:1,left:null,right:Object.freeze({value:2,left:Object.freeze({value:.5,left:null,right:null}),right:null})})),isSearchTree(chain)];})()", expected: [true, true, false, true] },

      { call: withTree('isSearchTree(node(10, node(5), node(15, node(6), node(20))))'), expected: false },
      { call: withTree('isSearchTree(node(0, node(-5), node(5)))'), expected: true },
      { call: withTree('isSearchTree(node(0, null, node(3, node(-1))))'), expected: false },
      { call: withTree('isSearchTree(node(3, null, node(3)))'), expected: false },
      { call: withTree('isSearchTree(node(1))'), expected: true },
      { call: withTree('isSearchTree(node(50, node(30, node(20), node(40, node(35), node(45))), node(70, node(60, node(55), node(65)), node(80))))'), expected: true },
      { call: withTree('isSearchTree(node(50, node(30, node(20), node(40, node(35), node(55))), node(70)))'), expected: false },
      { call: withTree('isSearchTree(node(-2e9, null, node(5e9)))'), expected: true },
    ],
  },
  'alg-mh-fewest-coins': {
    solution: `const fewestCoins = (coins, amount) => {
  if (amount === 0) return 0;
  if (coins.length === 0) return -1;
  const best = Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let total = 1; total <= amount; total++) {
    for (const coin of coins) {
      if (coin <= total) best[total] = Math.min(best[total], 1 + best[total - coin]);
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
};`,
    junior: `const fewestCoins = (coins, amount) => {
  if (amount === 0) return 0;
  if (coins.length === 0) return -1;
  const fewest = [0];
  for (let total = 1; total <= amount; total++) {
    let best = Infinity;
    for (const coin of coins) {
      if (coin <= total) {
        const withThisCoin = fewest[total - coin] + 1;
        if (withThisCoin < best) {
          best = withThisCoin;
        }
      }
    }
    fewest.push(best);
  }
  if (fewest[amount] === Infinity) {
    return -1;
  }
  return fewest[amount];
};`,
    senior: `const fewestCoins = (coins, amount) => {
  if (amount === 0) return 0;
  if (coins.length === 0) return -1;
  const memo = new Map([[0, 0]]);
  for (let left = 1; left <= amount; left++) {
    let count = Infinity;
    for (const coin of coins) {
      if (coin <= left) count = Math.min(count, 1 + memo.get(left - coin));
    }
    memo.set(left, count);
  }
  const answer = memo.get(amount);
  return Number.isFinite(answer) ? answer : -1;
};`,
    hiddenTests: [
      { call: "(() => {const coins=[4,1,3],copy=coins.slice(),a=fewestCoins(coins,6);return [a,coins.every((value,i)=>Object.is(value,copy[i])),fewestCoins(Object.freeze([4,1,3]),6),fewestCoins(Object.freeze([]),0),fewestCoins(Object.freeze([]),10),fewestCoins(Object.freeze([7,7]),14)];})()", expected: [2, true, 2, 0, -1, 2] },
      { call: "(() => {for(let mask=0;mask<32;mask++){const coins=[];for(let coin=1;coin<=5;coin++)if(mask&(1<<(coin-1)))coins.push(coin);const enumerate=(index,left)=>{if(left===0)return 0;if(index===coins.length)return Infinity;let best=Infinity;for(let count=0;count*coins[index]<=left;count++)best=Math.min(best,count+enumerate(index+1,left-count*coins[index]));return best;};for(let amount=0;amount<=20;amount++){const value=enumerate(0,amount),wanted=value===Infinity?-1:value;if(fewestCoins(Object.freeze(coins.slice().reverse()),amount)!==wanted)return false;}}return true;})()", expected: true },
      { call: "[fewestCoins(Object.freeze([1]),10000),fewestCoins(Object.freeze(Array(20).fill(1)),10000),fewestCoins(Object.freeze([9999,10000]),10000),fewestCoins(Object.freeze([4,6]),9999),fewestCoins(Object.freeze([10000]),1),fewestCoins(Object.freeze([]),10000),fewestCoins(Object.freeze([1]),-0)]", expected: [10000, 10000, 1, -1, -1, -1, 0] },

      { call: 'fewestCoins([2, 5], 3)', expected: -1 },
      { call: 'fewestCoins([1, 5, 11], 15)', expected: 3 },
      { call: 'fewestCoins([25, 10, 1], 30)', expected: 3 },
      { call: 'fewestCoins([3, 5], 7)', expected: -1 },
      { call: 'fewestCoins([7, 11, 13], 400)', expected: 32 },
      { call: 'fewestCoins([4, 6], 999)', expected: -1 },
      { call: 'fewestCoins([186, 419, 83, 408], 6249)', expected: 20 },
    ],
  },
  /* ── Hard ─────────────────────────────────────────────────────────── */
  'alg-mh-trapped-rain': {
    solution: `const trappedWater = heights => {
  let left = 0;
  let right = heights.length - 1;
  let tallestLeft = 0;
  let tallestRight = 0;
  let water = 0;
  while (left < right) {
    tallestLeft = Math.max(tallestLeft, heights[left]);
    tallestRight = Math.max(tallestRight, heights[right]);
    // The lower side is settled: the other side has a wall at least that tall.
    if (tallestLeft <= tallestRight) {
      water += tallestLeft - heights[left];
      left++;
    } else {
      water += tallestRight - heights[right];
      right--;
    }
  }
  return water;
};`,
    junior: `const trappedWater = heights => {
  let left = 0;
  let right = heights.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let total = 0;
  while (left < right) {
    leftMax = Math.max(leftMax, heights[left]);
    rightMax = Math.max(rightMax, heights[right]);
    if (leftMax <= rightMax) {
      total += leftMax - heights[left];
      left += 1;
    } else {
      total += rightMax - heights[right];
      right -= 1;
    }
  }
  return total;
};`,
    senior: `const trappedWater = heights => {
  let [left, right] = [0, heights.length - 1];
  let [leftMax, rightMax, water] = [0, 0, 0];
  while (left < right) {
    // Move the lower wall: the taller one guarantees a bound on its side.
    if (heights[left] < heights[right]) {
      leftMax = Math.max(leftMax, heights[left]);
      water += leftMax - heights[left++];
    } else {
      rightMax = Math.max(rightMax, heights[right]);
      water += rightMax - heights[right--];
    }
  }
  return water;
};`,
    hiddenTests: [
      { call: "(() => {const values=[3,-0,3],copy=values.slice(),answer=trappedWater(values);return [answer,values.every((v,i)=>Object.is(v,copy[i])),trappedWater(Object.freeze([2,0,1])),trappedWater(Object.freeze([])),trappedWater(Object.freeze([1,2]))];})()", expected: [3, true, 1, 0, 0] },
      { call: "(() => {const alphabet=[0,1,3,5];for(let n=0;n<=5;n++)for(let code=0;code<4**n;code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%4]);digits=Math.floor(digits/4);}let wanted=0;for(let i=0;i<n;i++){let a=0,b=0;for(let j=0;j<=i;j++)a=Math.max(a,values[j]);for(let j=i;j<n;j++)b=Math.max(b,values[j]);wanted+=Math.min(a,b)-values[i];}if(trappedWater(Object.freeze(values))!==wanted)return false;}return true;})()", expected: true },
      { call: "[trappedWater(Object.freeze(Array.from({length:50000},(_,i)=>i===0||i===49999?1000000:0))),trappedWater(Object.freeze(Array(50000).fill(1000000))),trappedWater(Object.freeze(Array.from({length:50000},(_,i)=>i))),trappedWater(Object.freeze(Array(50000).fill(0)))]", expected: [49998000000, 0, 0, 0] },

      { call: 'trappedWater([2, 0, 2, 0, 2])', expected: 4 },
      { call: 'trappedWater([0, 0, 0])', expected: 0 },
      { call: 'trappedWater([3, 1, 2, 1, 3])', expected: 5 },
      { call: 'trappedWater([5, 4, 1, 2])', expected: 1 },
      { call: 'trappedWater([2, 0, 1])', expected: 1 },
      { call: 'trappedWater(Array.from({ length: 50000 }, (_, i) => (i * 7919) % 101))', expected: 2499272 },
      { call: 'trappedWater(Array.from({ length: 50000 }, (_, i) => Math.abs(25000 - i)))', expected: 624950001 },
    ],
  },
  'alg-mh-fastest-route': {
    solution: `const fastestRoute = (tracks, start, goal) => {
  // A Map keeps any station name, "constructor" included, apart from what objects inherit.
  const neighbours = new Map();
  const link = (from, to, minutes) => {
    if (!neighbours.has(from)) neighbours.set(from, []);
    neighbours.get(from).push([to, minutes]);
  };
  for (const [from, to, minutes] of tracks) {
    link(from, to, minutes);
    link(to, from, minutes); // every track runs both ways
  }
  const time = new Map([[start, 0]]);
  const cameFrom = new Map();
  const settled = new Set();
  while (true) {
    // Settle the reached station with the smallest time: no route to it can get shorter.
    let current = null;
    for (const [station, minutes] of time) {
      if (!settled.has(station) && (current === null || minutes < time.get(current))) current = station;
    }
    if (current === null) return null; // everything reachable is settled, and the goal was not
    settled.add(current);
    if (current === goal) {
      const route = [goal];
      for (let at = goal; at !== start; ) {
        at = cameFrom.get(at);
        route.push(at);
      }
      route.reverse();
      return { minutes: time.get(goal), route };
    }
    for (const [next, minutes] of neighbours.get(current) ?? []) {
      const through = time.get(current) + minutes;
      if (!time.has(next) || through < time.get(next)) {
        time.set(next, through);
        cameFrom.set(next, current);
      }
    }
  }
};`,
    junior: `const fastestRoute = (tracks, start, goal) => {
  const neighbours = new Map();
  for (const track of tracks) {
    const from = track[0];
    const to = track[1];
    const minutes = track[2];
    if (!neighbours.has(from)) {
      neighbours.set(from, []);
    }
    if (!neighbours.has(to)) {
      neighbours.set(to, []);
    }
    neighbours.get(from).push({ station: to, minutes: minutes });
    neighbours.get(to).push({ station: from, minutes: minutes });
  }
  const best = new Map();
  best.set(start, 0);
  const previous = new Map();
  const done = new Set();
  let current = start;
  while (current !== null) {
    done.add(current);
    if (current === goal) {
      const route = [];
      let station = goal;
      while (station !== start) {
        route.push(station);
        station = previous.get(station);
      }
      route.push(start);
      route.reverse();
      return { minutes: best.get(goal), route: route };
    }
    const edges = neighbours.get(current) || [];
    for (const edge of edges) {
      const candidate = best.get(current) + edge.minutes;
      if (!best.has(edge.station) || candidate < best.get(edge.station)) {
        best.set(edge.station, candidate);
        previous.set(edge.station, current);
      }
    }
    current = null;
    let smallest = Infinity;
    for (const [station, minutes] of best) {
      if (!done.has(station) && minutes < smallest) {
        smallest = minutes;
        current = station;
      }
    }
  }
  return null;
};`,
    senior: `const fastestRoute = (tracks, start, goal) => {
  const edges = new Map();
  for (const [a, b, cost] of tracks) {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!edges.has(from)) edges.set(from, []);
      edges.get(from).push([to, cost]);
    }
  }
  const distance = new Map([[start, 0]]);
  const parent = new Map();
  const done = new Set();
  while (true) {
    let node;
    let minimum = Infinity;
    for (const [candidate, cost] of distance) {
      if (!done.has(candidate) && cost < minimum) {
        node = candidate;
        minimum = cost;
      }
    }
    if (node === undefined) return null;
    if (node === goal) {
      const route = [];
      for (let at = goal; at !== undefined; at = parent.get(at)) route.push(at);
      return { minutes: minimum, route: route.reverse() };
    }
    done.add(node);
    for (const [next, cost] of edges.get(node) ?? []) {
      const through = minimum + cost;
      if (through < (distance.get(next) ?? Infinity)) {
        distance.set(next, through);
        parent.set(next, node);
      }
    }
  }
};`,
    hiddenTests: [
      { call: "(() => {const names=[\"\",\"__proto__\",\"x\"],pairs=[[0,1],[0,2],[1,2]];for(let code=0;code<27;code++){let digits=code;const tracks=[],dist=names.map((_,i)=>names.map((_,j)=>i===j?0:Infinity));for(const[a,b]of pairs){const choice=digits%3;digits=Math.floor(digits/3);if(choice){const w=choice===1?0:2;tracks.push(Object.freeze([names[a],names[b],w]));dist[a][b]=dist[b][a]=w;}}Object.freeze(tracks);for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)dist[i][j]=Math.min(dist[i][j],dist[i][k]+dist[k][j]);for(let s=0;s<3;s++)for(let g=0;g<3;g++){const out=fastestRoute(tracks,names[s],names[g]),wanted=dist[s][g];if(wanted===Infinity){if(out!==null)return false;continue;}if(!out||out.minutes!==wanted||!Array.isArray(out.route)||out.route[0]!==names[s]||out.route[out.route.length-1]!==names[g]||new Set(out.route).size!==out.route.length)return false;let sum=0;for(let at=1;at<out.route.length;at++){let edge=Infinity;for(const[a,b,w]of tracks)if(a===out.route[at-1]&&b===out.route[at]||b===out.route[at-1]&&a===out.route[at])edge=Math.min(edge,w);sum+=edge;}if(sum!==wanted)return false;}}return true;})()", expected: true },
      { call: "(() => {const tracks=Object.freeze([Object.freeze([\"\",\"constructor\",0]),Object.freeze([\"constructor\",\"goal\",999999999]),Object.freeze([\"\",\"goal\",1000000000]),Object.freeze([\"goal\",\"goal\",0])]),one=fastestRoute(tracks,\"\",\"goal\"),two=fastestRoute(tracks,\"\",\"goal\");if(one.minutes!==999999999||one.route.join(\"|\")!==\"|constructor|goal\"||one.route===two.route)return false;one.route[0]=\"changed\";return two.route[0]===\"\"&&tracks[0][0]===\"\"&&fastestRoute([],\"absent\",\"other\")===null;})()", expected: true },
      { call: "(() => {const tracks=Object.freeze(Array.from({length:199},(_,i)=>Object.freeze([\"n\"+i,\"n\"+(i+1),1000000000]))),out=fastestRoute(tracks,\"n0\",\"n199\"),many=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze([\"a\",\"b\",i+1])));return [out.minutes,out.route.length,out.route.every((v,i)=>v===\"n\"+i),fastestRoute(many,\"a\",\"b\").minutes];})()", expected: [199000000000, 200, true, 1] },

      { call: 'fastestRoute([["S", "A", 1], ["S", "B", 4], ["A", "B", 1], ["B", "T", 1]], "S", "T")', expected: { minutes: 3, route: ['S', 'A', 'B', 'T'] } },
      { call: 'fastestRoute([["A", "B", 0], ["B", "C", 3], ["A", "C", 4]], "A", "C")', expected: { minutes: 3, route: ['A', 'B', 'C'] } },
      { call: 'fastestRoute([["A", "B", 1], ["C", "D", 1]], "A", "D")', expected: null },
      { call: 'fastestRoute([["A", "B", 1]], "Z", "A")', expected: null },
      { call: 'fastestRoute([["A", "B", 5], ["A", "B", 3], ["B", "C", 1]], "A", "C")', expected: { minutes: 4, route: ['A', 'B', 'C'] } },
      { call: 'fastestRoute([["constructor", "toString", 2], ["toString", "hasOwnProperty", 3], ["constructor", "hasOwnProperty", 9]], "constructor", "hasOwnProperty")', expected: { minutes: 5, route: ['constructor', 'toString', 'hasOwnProperty'] } },
      { call: `(() => { ${GRID_TRACKS} return fastestRoute(tracks, "0:0", "9:9").minutes; })()`, expected: 63 },
    ],
  },
  'alg-mh-longest-rising': {
    solution: `const longestRising = scores => {
  // tails[k]: the smallest score that ends a rising run of length k + 1. Always sorted.
  const tails = [];
  for (const score of scores) {
    let low = 0;
    let high = tails.length;
    // The first tail that is not smaller than score.
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (tails[middle] < score) low = middle + 1;
      else high = middle;
    }
    tails[low] = score; // a lower ending for that length, or one run longer than any so far
  }
  return tails.length;
};`,
    junior: `const longestRising = scores => {
  const tails = [];
  for (const score of scores) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (tails[middle] < score) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    if (low === tails.length) {
      tails.push(score);
    } else {
      tails[low] = score;
    }
  }
  return tails.length;
};`,
    senior: `const lowerBound = (sorted, value) => {
  let [low, high] = [0, sorted.length];
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
};

const longestRising = scores =>
  scores.reduce((tails, score) => {
    tails[lowerBound(tails, score)] = score;
    return tails;
  }, []).length;`,
    hiddenTests: [
      { call: "(() => {const alphabet=[-1,-0,.5,2];for(let n=0;n<=5;n++)for(let code=0;code<4**n;code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%4]);digits=Math.floor(digits/4);}let best=0;for(let mask=0;mask<2**n;mask++){let previous=-Infinity,count=0,valid=true;for(let i=0;i<n;i++)if(mask&(1<<i)){if(!(previous<values[i]))valid=false;previous=values[i];count++;}if(valid)best=Math.max(best,count);}if(longestRising(Object.freeze(values))!==best)return false;}return true;})()", expected: true },
      { call: "(() => {const values=[-0,0,.1,.2,.3,1000000000000],copy=values.slice();return [longestRising(values),values.every((v,i)=>Object.is(v,copy[i])),longestRising(Object.freeze([.2,.1,.15,.3])),longestRising(Object.freeze([-1000000000000,0,1000000000000]))];})()", expected: [5, true, 3, 3] },
      { call: "[longestRising(Object.freeze(Array.from({length:20000},(_,i)=>i/10))),longestRising(Object.freeze(Array.from({length:20000},(_,i)=>-i/10))),longestRising(Object.freeze(Array(20000).fill(.1)))]", expected: [20000, 1, 1] },

      { call: 'longestRising([3, 10, 2, 1, 20])', expected: 3 },
      { call: 'longestRising([4, 10, 4, 3, 8, 9])', expected: 3 },
      { call: 'longestRising([-5, -3, -4, 0, -1, 2])', expected: 4 },
      { call: 'longestRising([1, 3, 6, 7, 9, 4, 10, 5, 6])', expected: 6 },
      { call: 'longestRising([2, 2, 3])', expected: 2 },
      { call: 'longestRising(Array.from({ length: 20000 }, (_, i) => (i * 7919) % 20011))', expected: 145 },
      { call: 'longestRising(Array.from({ length: 20000 }, (_, i) => (i % 1000) + Math.floor(i / 1000)))', expected: 1019 },
    ],
  },
  'alg-mh-tree-to-text': {
    solution: `const serialize = root => {
  const parts = [];
  // Preorder, with "#" for every missing child: enough to rebuild the shape.
  const write = node => {
    if (node === null) {
      parts.push("#");
      return;
    }
    parts.push(String(node.value));
    write(node.left);
    write(node.right);
  };
  write(root);
  return parts.join(",");
};

const deserialize = text => {
  const parts = text.split(",");
  let next = 0; // shared by every read of this call, and fresh for each call
  const read = () => {
    const item = parts[next++];
    if (item === "#") return null;
    // Property order is evaluation order: the left subtree is read first.
    return { value: Number(item), left: read(), right: read() };
  };
  return read();
};`,
    junior: `const serialize = root => {
  const parts = [];
  const write = node => {
    if (node === null) parts.push("#");
    else {
      parts.push(String(node.value));
      write(node.left);
      write(node.right);
    }
  };
  write(root);
  return parts.join(",");
};

const deserialize = text => {
  const items = text.split(",");
  let position = 0;
  const readNode = () => {
    const item = items[position];
    position = position + 1;
    if (item === "#") {
      return null;
    }
    const node = { value: Number(item), left: null, right: null };
    node.left = readNode();
    node.right = readNode();
    return node;
  };
  return readNode();
};`,
    senior: `const serialize = root => {
  const parts = [];
  const write = node => {
    if (node === null) parts.push("#");
    else {
      parts.push(String(node.value));
      write(node.left);
      write(node.right);
    }
  };
  write(root);
  return parts.join(",");
};

const deserialize = text => {
  const items = text.split(",")[Symbol.iterator]();
  const read = () => {
    const { value: item } = items.next();
    return item === "#" ? null : { value: Number(item), left: read(), right: read() };
  };
  return read();
};`,
    hiddenTests: [
      { call: "(() => {const memo=[[null]],shapes=n=>{if(memo[n])return memo[n];const out=[];for(let k=0;k<n;k++)for(const a of shapes(k))for(const b of shapes(n-k-1))out.push([a,b]);return memo[n]=out;};for(let n=0;n<=5;n++)for(const shape of shapes(n)){let serial=0;const tokens=[],make=s=>{if(s===null){tokens.push(\"#\");return null;}const value=[-9007199254740991,-0,120,9007199254740991][serial++%4];tokens.push(String(value));return Object.freeze(Object.assign(Object.create(null),{value,left:make(s[0]),right:make(s[1])}));},root=make(shape),text=tokens.join(\",\");if(serialize(root)!==text)return false;const copy=deserialize(text),stack=[[root,copy]],seen=new Set();while(stack.length){const[a,b]=stack.pop();if(a===null){if(b!==null)return false;continue;}if(!b||a===b||seen.has(b)||a.value!==b.value||![\"value\",\"left\",\"right\"].every(key=>Object.hasOwn(b,key)))return false;seen.add(b);stack.push([a.left,b.left],[a.right,b.right]);}}return true;})()", expected: true },
      { call: "(() => {const text=\"9007199254740991,-9007199254740991,#,#,0,#,#\",a=deserialize(text),b=deserialize(text);a.left.value=3;a.right=null;return [b.value,b.left.value,b.right.value,a!==b,a.left!==b.left,serialize(Object.freeze({value:-0,left:null,right:null}))];})()", expected: [9007199254740991, -9007199254740991, 0, true, true, "0,#,#"] },
      { call: "(() => {let root=null;const tokens=[];for(let i=511;i>=0;i--)root=Object.freeze({value:i,left:root,right:null});for(let i=0;i<512;i++)tokens.push(String(i));for(let i=0;i<513;i++)tokens.push(\"#\");const text=tokens.join(\",\");if(serialize(root)!==text||serialize(deserialize(text))!==text)return false;const build=(lo,hi)=>{if(lo>=hi)return null;const mid=Math.floor((lo+hi)/2);return Object.freeze({value:mid,left:build(lo,mid),right:build(mid+1,hi)});},wide=build(0,2000),encoded=serialize(wide),copy=deserialize(encoded);return encoded.split(\",\").length===4001&&serialize(copy)===encoded&&copy!==wide;})()", expected: true },

      { call: 'deserialize("5,4,11,7,#,#,2,#,#,#,8,13,#,#,4,#,1,#,#")', expected: tree(5, tree(4, tree(11, tree(7), tree(2))), tree(8, tree(13), tree(4, null, tree(1)))) },
      { call: withTree('serialize(node(5, node(4, node(11, node(7), node(2))), node(8, node(13), node(4, null, node(1)))))'), expected: '5,4,11,7,#,#,2,#,#,#,8,13,#,#,4,#,1,#,#' },
      { call: withTree('serialize(node(0))'), expected: '0,#,#' },
      { call: 'deserialize("-1,#,-2,#,#")', expected: tree(-1, null, tree(-2)) },
      { call: '[deserialize("1,#,#"), deserialize("2,#,#")]', expected: [tree(1), tree(2)] },
      { call: withTree('(() => { let root = null; for (let i = 0; i < 300; i++) root = node(i, root); const text = serialize(root); return [serialize(deserialize(text)) === text, text.split(",").length]; })()'), expected: [true, 601] },
    ],
  },
  'alg-mh-smallest-window': {
    solution: `const smallestWindow = (text, letters) => {
  if (letters === "") return "";
  const points = Array.from(text);
  // How many more of each character the window needs; below 0 means spare.
  const need = new Map();
  for (const char of letters) need.set(char, (need.get(char) ?? 0) + 1);
  let missing = Array.from(letters).length; // needed characters the window still lacks, repeats counted
  let bestStart = 0;
  let bestLength = Infinity;
  let left = 0;
  for (let right = 0; right < points.length; right++) {
    const char = points[right];
    if (need.has(char)) {
      if (need.get(char) > 0) missing--;
      need.set(char, need.get(char) - 1);
    }
    // Shrink from the left for as long as the window still holds everything.
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestStart = left; // strictly shorter only, so a tie keeps the leftmost
        bestLength = right - left + 1;
      }
      const gone = points[left];
      if (need.has(gone)) {
        need.set(gone, need.get(gone) + 1);
        if (need.get(gone) > 0) missing++;
      }
      left++;
    }
  }
  return bestLength === Infinity ? "" : points.slice(bestStart, bestStart + bestLength).join("");
};`,
    junior: `const smallestWindow = (text, letters) => {
  if (letters.length === 0) {
    return "";
  }
  const points = Array.from(text);
  const need = Object.create(null);
  for (const char of letters) {
    if (need[char] === undefined) {
      need[char] = 1;
    } else {
      need[char] = need[char] + 1;
    }
  }
  let missing = Array.from(letters).length;
  let bestStart = 0;
  let bestLength = Infinity;
  let left = 0;
  let right = 0;
  while (right < points.length) {
    const added = points[right];
    if (need[added] !== undefined) {
      if (need[added] > 0) {
        missing = missing - 1;
      }
      need[added] = need[added] - 1;
    }
    right = right + 1;
    while (missing === 0) {
      const length = right - left;
      if (length < bestLength) {
        bestLength = length;
        bestStart = left;
      }
      const removed = points[left];
      if (need[removed] !== undefined) {
        need[removed] = need[removed] + 1;
        if (need[removed] > 0) {
          missing = missing + 1;
        }
      }
      left = left + 1;
    }
  }
  if (bestLength === Infinity) {
    return "";
  }
  return points.slice(bestStart, bestStart + bestLength).join("");
};`,
    senior: `const smallestWindow = (text, letters) => {
  if (!letters) return "";
  const points = Array.from(text);
  const need = new Map();
  for (const char of letters) need.set(char, (need.get(char) ?? 0) + 1);
  let missing = Array.from(letters).length;
  let [bestStart, bestEnd] = [0, Infinity];
  for (let left = 0, right = 0; right < points.length; right++) {
    const char = points[right];
    if (!need.has(char)) continue;
    if (need.get(char) > 0) missing--;
    need.set(char, need.get(char) - 1);
    for (; missing === 0; left++) {
      if (right + 1 - left < bestEnd - bestStart) [bestStart, bestEnd] = [left, right + 1];
      const gone = points[left];
      if (need.has(gone) && need.set(gone, need.get(gone) + 1).get(gone) > 0) missing++;
    }
  }
  return bestEnd === Infinity ? "" : points.slice(bestStart, bestEnd).join("");
};`,
    hiddenTests: [{"call": "(() => {const strings=[''],alphabet=['a','b','\ud83d\ude00'];let frontier=[''];for(let n=1;n<=4;n++){frontier=frontier.flatMap(prefix=>alphabet.map(char=>prefix+char));strings.push(...frontier);}const wanted=strings.filter(value=>[...value].length<=2);for(const text of strings)for(const letters of wanted){const points=[...text],need=[...letters];let best='';if(need.length){let size=Infinity;for(let left=0;left<points.length;left++)for(let end=left+1;end<=points.length;end++){const counts=new Map();for(let i=left;i<end;i++)counts.set(points[i],(counts.get(points[i])||0)+1);const required=new Map();for(const char of need)required.set(char,(required.get(char)||0)+1);if([...required].every(([char,count])=>(counts.get(char)||0)>=count)&&end-left<size){size=end-left;best=points.slice(left,end).join('');}}}if(smallestWindow(text,letters)!==best)return false;}return true;})()", "expected": true}, {"call": "[smallestWindow('x\ud83d\ude00y','\ud83d\ude00'),smallestWindow('\ud83d\ude00','\\ud83d'),smallestWindow('x\\ud83dy','\\ud83d'),smallestWindow('\u00e9','e\\u0301'),smallestWindow('\ud83d\ude00abx\ud83d\ude00a','\ud83d\ude00a'),smallestWindow('abXba','ab')]", "expected": ["\ud83d\ude00", "", "\ud83d", "", "\ud83d\ude00a", "ab"]}, {"call": "[smallestWindow('\ud83d\ude00'.repeat(25000),'\ud83d\ude00'.repeat(10000)).length,smallestWindow('a'.repeat(49999)+'b','ab'),smallestWindow('a'.repeat(50000),'b'),smallestWindow('','\ud83d\ude00')]", "expected": [20000, "ab", "", ""]}, {"call": "smallestWindow(\"abcabdebac\", \"cda\")", "expected": "cabd"}, {"call": "smallestWindow(\"bba\", \"ab\")", "expected": "ba"}, {"call": "smallestWindow(\"abcdebdde\", \"bde\")", "expected": "deb"}, {"call": "smallestWindow(\"abxba\", \"ab\")", "expected": "ab"}, {"call": "smallestWindow(\"xxxx\", \"y\")", "expected": ""}, {"call": "(() => { const text = Array.from({ length: 50000 }, (_, i) => \"abcdefghij\"[(i * 7) % 10]).join(\"\"); const found = smallestWindow(text, \"jjaa\"); return [found.length, text.indexOf(found)]; })()", "expected": [14, 7]}, {"call": "smallestWindow(\"x\".repeat(49999) + \"y\", \"yx\")", "expected": "xy"}],
  },
  'alg-mh-merge-contacts': {
    solution: `const mergeContacts = contacts => {
  const byEmail = new Map();
  contacts.forEach(({ emails }, index) => {
    for (const email of emails) {
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email).push(index);
    }
  });
  const visited = new Set();
  const people = [];
  contacts.forEach(({ name }, index) => {
    if (visited.has(index)) return;
    visited.add(index);
    const pending = [index];
    const emails = new Set();
    while (pending.length) {
      const current = pending.pop();
      for (const email of contacts[current].emails) {
        emails.add(email);
        const neighbors = byEmail.get(email);
        if (!neighbors) continue;
        byEmail.delete(email); // consume this adjacency just once
        for (const other of neighbors) {
          if (visited.has(other)) continue;
          visited.add(other);
          pending.push(other);
        }
      }
    }
    people.push({ name, emails: [...emails].sort() });
  });
  return people;
};`,
    junior: `const mergeContacts = contacts => {
  const contactsByEmail = new Map();
  for (let index = 0; index < contacts.length; index++) {
    for (const email of contacts[index].emails) {
      if (!contactsByEmail.has(email)) {
        contactsByEmail.set(email, []);
      }
      contactsByEmail.get(email).push(index);
    }
  }
  const visited = new Set();
  const people = [];
  for (let index = 0; index < contacts.length; index++) {
    if (visited.has(index)) {
      continue;
    }
    visited.add(index);
    const emails = new Set();
    const toVisit = [index];
    while (toVisit.length > 0) {
      const current = toVisit.pop();
      for (const email of contacts[current].emails) {
        emails.add(email);
        const neighbors = contactsByEmail.get(email);
        if (neighbors === undefined) continue;
        contactsByEmail.delete(email);
        for (const other of neighbors) {
          if (!visited.has(other)) {
            visited.add(other);
            toVisit.push(other);
          }
        }
      }
    }
    const sorted = Array.from(emails);
    sorted.sort();
    people.push({ name: contacts[index].name, emails: sorted });
  }
  return people;
};`,
    senior: `const mergeContacts = contacts => {
  const parent = contacts.map((_, i) => i);
  const size = contacts.map(() => 1);
  const find = index => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const firstWith = new Map();
  contacts.forEach(({ emails }, index) => {
    for (const email of emails) {
      if (!firstWith.has(email)) {
        firstWith.set(email, index);
        continue;
      }
      let a = find(index), b = find(firstWith.get(email));
      if (a === b) continue;
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a;
      size[a] += size[b];
    }
  });
  const groups = new Map();
  contacts.forEach(({ name, emails }, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, { name, emails: new Set() });
    for (const email of emails) groups.get(root).emails.add(email);
  });
  return [...groups.values()].map(({ name, emails }) => ({ name, emails: [...emails].sort() }));
};`,
    hiddenTests: [{"call": "(() => {const pool=['','a','b'];for(let code=0;code<512;code++){const book=Array.from({length:3},(_,i)=>({name:'n'+i,emails:pool.filter((_,j)=>code&(1<<(i*3+j)))}));const connected=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>i===j||book[i].emails.some(email=>book[j].emails.includes(email))));for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)connected[i][j] ||= connected[i][k]&&connected[k][j];const expected=[],used=new Set();for(let i=0;i<3;i++){if(used.has(i))continue;const emails=new Set();for(let j=0;j<3;j++)if(connected[i][j]){used.add(j);for(const email of book[j].emails)emails.add(email);}expected.push({name:book[i].name,emails:[...emails].sort()});}const out=mergeContacts(book);if(JSON.stringify(out)!==JSON.stringify(expected))return false;}return true;})()", "expected": true}, {"call": "(() => {const first=Object.assign(Object.create(null),{name:' A ',emails:Object.freeze([' z ','','__proto__','\ud83d\ude00','\\ud83d'])}),second={name:'B',emails:Object.freeze(['','Z','constructor'])},book=Object.freeze([Object.freeze(first),Object.freeze(second)]),before=JSON.stringify(book),a=mergeContacts(book),b=mergeContacts(book);if(a===b||a[0]===b[0]||a[0].emails===b[0].emails||a[0]===first||a.length!==1||a[0].name!==' A '||JSON.stringify(a[0].emails)!==JSON.stringify([' z ','','__proto__','\ud83d\ude00','\\ud83d','Z','constructor'].sort())||JSON.stringify(book)!==before)return false;a[0].name='changed';a[0].emails.push('extra');return a[0].name==='changed'&&a[0].emails.includes('extra')&&b[0].name===' A '&&!b[0].emails.includes('extra')&&mergeContacts([])!==mergeContacts([]);})()", "expected": true}, {"call": "(() => {const chain=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze({name:'n'+i,emails:Object.freeze(['e'+i,'e'+(i+1)])}))),star=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze({name:'s'+i,emails:Object.freeze(Array(5).fill('shared'))}))),empty=Object.freeze(Array.from({length:2000},()=>Object.freeze({name:'',emails:Object.freeze([])})));const a=mergeContacts(chain),b=mergeContacts(star),c=mergeContacts(empty);return a.length===1&&a[0].name==='n0'&&a[0].emails.length===2001&&b.length===1&&b[0].name==='s0'&&b[0].emails[0]==='shared'&&b[0].emails.length===1&&c.length===2000&&c.every(item=>item.name===''&&item.emails.length===0);})()", "expected": true}, {"call": "mergeContacts([{ name: \"X\", emails: [] }, { name: \"Y\", emails: [\"y@x.dev\"] }])", "expected": [{"name": "X", "emails": []}, {"name": "Y", "emails": ["y@x.dev"]}]}, {"call": "mergeContacts([{ name: \"A\", emails: [\"a@x.dev\"] }, { name: \"B\", emails: [\"b@x.dev\"] }, { name: \"C\", emails: [\"c@x.dev\"] }, { name: \"D\", emails: [\"c@x.dev\", \"a@x.dev\"] }])", "expected": [{"name": "A", "emails": ["a@x.dev", "c@x.dev"]}, {"name": "B", "emails": ["b@x.dev"]}]}, {"call": "mergeContacts([{ name: \"Kim\", emails: [\"kim@x.dev\", \"Kim@x.dev\"] }, { name: \"K\", emails: [\"k@x.dev\", \"kim@x.dev\"] }, { name: \"Kay\", emails: [\"kim@x.dev\"] }])", "expected": [{"name": "Kim", "emails": ["Kim@x.dev", "k@x.dev", "kim@x.dev"]}]}, {"call": "(() => { const book = [{ name: \"A\", emails: [\"z@x.dev\", \"a@x.dev\"] }, { name: \"B\", emails: [\"a@x.dev\"] }]; mergeContacts(book); return book; })()", "expected": [{"name": "A", "emails": ["z@x.dev", "a@x.dev"]}, {"name": "B", "emails": ["a@x.dev"]}]}, {"call": "(() => { const book = Array.from({ length: 300 }, (_, i) => ({ name: \"c\" + i, emails: [\"e\" + i + \"@x.dev\", \"e\" + (i + 1) + \"@x.dev\"] })); const people = mergeContacts(book); return [people.length, people[0].name, people[0].emails.length, people[0].emails[0], people[0].emails[299]]; })()", "expected": [1, "c0", 301, "e0@x.dev", "e99@x.dev"]}, {"call": "(() => { const book = Array.from({ length: 100 }, (_, i) => ({ name: \"c\" + i, emails: [\"e\" + i + \"@x.dev\"] })); book.push({ name: \"hub\", emails: Array.from({ length: 50 }, (_, i) => \"e\" + (i * 2 + 1) + \"@x.dev\") }); const people = mergeContacts(book); return [people.length, people[0].name, people[1].name, people[1].emails.length, people[2].name, people[50].name]; })()", "expected": [51, "c0", "c1", 50, "c2", "c98"]}],
  },
  'alg-mh-split-words': {
    solution: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  const cuts = Array.from({ length: text.length + 1 }, () => []);
  const canFinish = Array(text.length + 1).fill(false);
  canFinish[text.length] = true;
  for (let start = text.length - 1; start >= 0; start--) {
    for (let end = start + 1; end <= text.length; end++) {
      if (canFinish[end] && dictionary.has(text.slice(start, end))) cuts[start].push(end);
    }
    canFinish[start] = cuts[start].length > 0;
  }
  const answers = [], path = [];
  const visit = start => {
    if (start === text.length) {
      answers.push(path.join(" "));
      return;
    }
    for (const end of cuts[start]) {
      path.push(text.slice(start, end));
      visit(end);
      path.pop();
    }
  };
  visit(0);
  return answers.sort();
};`,
    junior: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  const cuts = [];
  const reachable = [];
  for (let i = 0; i <= text.length; i++) {
    cuts.push([]);
    reachable.push(false);
  }
  reachable[text.length] = true;
  for (let start = text.length - 1; start >= 0; start--) {
    for (let end = start + 1; end <= text.length; end++) {
      if (reachable[end] && dictionary.has(text.slice(start, end))) {
        cuts[start].push(end);
        reachable[start] = true;
      }
    }
  }
  const answers = [];
  const chosen = [];
  function collect(start) {
    if (start === text.length) {
      answers.push(chosen.join(" "));
      return;
    }
    for (let i = 0; i < cuts[start].length; i++) {
      const end = cuts[start][i];
      chosen.push(text.slice(start, end));
      collect(end);
      chosen.pop();
    }
  }
  collect(0);
  answers.sort();
  return answers;
};`,
    senior: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  const edges = Array.from({ length: text.length + 1 }, () => []);
  const finishes = new Set([text.length]);
  for (let start = text.length - 1; start >= 0; start--) {
    for (let end = start + 1; end <= text.length; end++) {
      if (finishes.has(end) && dictionary.has(text.slice(start, end))) edges[start].push(end);
    }
    if (edges[start].length) finishes.add(start);
  }
  const output = [], path = [];
  const emit = start => {
    if (start === text.length) output.push(path.join(" "));
    else for (const end of edges[start]) {
      path.push(text.slice(start, end));
      emit(end);
      path.pop();
    }
  };
  emit(0);
  return output.toSorted();
};`,
    hiddenTests: [{"call": "(() => {const dictionary=['a','b','aa','ab','ba','bb'],texts=[''];for(let n=1;n<=4;n++)for(let bits=0;bits<2**n;bits++)texts.push(Array.from({length:n},(_,i)=>bits&(1<<i)?'a':'b').join(''));for(const text of texts)for(let mask=0;mask<64;mask++){const words=Object.freeze(dictionary.filter((_,i)=>mask&(1<<i))),expected=[];if(!text.length)expected.push('');else for(let cuts=0;cuts<2**(text.length-1);cuts++){const parts=[];let start=0;for(let end=1;end<=text.length;end++)if(end===text.length||cuts&(1<<(end-1))){parts.push(text.slice(start,end));start=end;}if(parts.every(part=>words.includes(part)))expected.push(parts.join(' '));}expected.sort();if(JSON.stringify(splitWords(text,words))!==JSON.stringify(expected))return false;}return true;})()", "expected": true}, {"call": "(() => {const words=Object.freeze(['\\ta','\ud83d\ude00','\\ud83d','a','\ud83d\ude00','e\\u0301']),a=splitWords('\\ta',words),b=splitWords('\\ta',words);if(JSON.stringify(a)!==JSON.stringify(['\\ta'])||a===b)return false;a.push('changed');return a.length===2&&b.length===1&&JSON.stringify(splitWords('\ud83d\ude00',['\\ud83d','\\ude00','\ud83d\ude00']))===JSON.stringify(['\\ud83d \\ude00','\ud83d\ude00'].sort())&&splitWords('\u00e9',['e\\u0301']).length===0&&splitWords('a b',['a','b']).length===0&&splitWords('',Object.freeze([]))[0]==='';})()", "expected": true}, {"call": "(() => {const words=Object.freeze(Array.from({length:2000},(_,i)=>'w'+i));const text='a'.repeat(200);return splitWords(text,Object.freeze(['a'])).join('')===Array(200).fill('a').join(' ')&&splitWords(text,words).length===0&&splitWords('a'.repeat(199)+'b',Object.freeze(['a','aa','aaa','aaaa'])).length===0;})()", "expected": true}, {"call": "splitWords(\"a\".repeat(30) + \"b\", [\"a\", \"aa\", \"aaa\", \"aaaa\"])", "expected": []}, {"call": "(() => { const all = splitWords(\"a\".repeat(18), [\"a\", \"aa\"]); return [all.length, all[0], all[all.length - 1]]; })()", "expected": [4181, "a a a a a a a a a a a a a a a a a a", "aa aa aa aa aa aa aa aa aa"]}, {"call": "splitWords(\"abcd\", [\"a\", \"abc\", \"b\", \"cd\", \"bcd\", \"d\"])", "expected": ["a b cd", "a bcd", "abc d"]}, {"call": "splitWords(\"dogdog\", [\"dog\", \"dog\"])", "expected": ["dog dog"]}, {"call": "splitWords(\"aaab\", [\"a\", \"aa\", \"aaa\", \"b\", \"ab\"])", "expected": ["a a a b", "a a ab", "a aa b", "aa a b", "aa ab", "aaa b"]}, {"call": "splitWords(\"penpineapple\", [\"pen\", \"pine\", \"apple\", \"pineapple\", \"pin\"])", "expected": ["pen pine apple", "pen pineapple"]}],
  },
};
