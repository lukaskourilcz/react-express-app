/** Server-only solutions for the Algorithms section's short paths.
 *
 * Every level adds a function to the same file, so a level's solution is
 * every earlier level's code plus its own. The content contract proves all
 * three boards against every visible and hidden check. */

import type { CodingSolution } from '../types';
import { cumulativeLevels, type Boards, type Hidden } from './path-boards';

const POINTERS: Boards = {
  reference: [
    `function pairWithSum(sorted, target) {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [left, right];
    // Sorted input: moving left up raises the sum, moving right down lowers it.
    if (sum < target) left += 1;
    else right -= 1;
  }
  return [];
}`,
    `function removeDuplicates(sorted) {
  if (sorted.length === 0) return 0;
  let slow = 1; // the next free slot; slot 0 always stays
  for (let fast = 1; fast < sorted.length; fast += 1) {
    // Sorted input: a new value differs from the last one kept.
    if (sorted[fast] !== sorted[slow - 1]) {
      sorted[slow] = sorted[fast];
      slow += 1;
    }
  }
  return slow;
}`,
    `function isSubsequence(small, big) {
  const wanted = [...small];
  let i = 0;
  for (const char of big) {
    if (i < wanted.length && char === wanted[i]) i += 1;
  }
  return i === wanted.length;
}`,
    `function minWindowSum(numbers, target) {
  let best = Infinity;
  let sum = 0;
  let left = 0;
  for (let right = 0; right < numbers.length; right += 1) {
    sum += numbers[right];
    // Positive numbers: shrinking only lowers the sum, so shrink while it still reaches the target.
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= numbers[left];
      left += 1;
    }
  }
  return best === Infinity ? 0 : best;
}`,
    `function longestOnes(bits, k) {
  let best = 0;
  let zeros = 0;
  let left = 0;
  for (let right = 0; right < bits.length; right += 1) {
    if (bits[right] === 0) zeros += 1;
    // More zeros than flips: move the left edge until the window is valid again.
    while (zeros > k) {
      if (bits[left] === 0) zeros -= 1;
      left += 1;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
  ],
  junior: [
    `function pairWithSum(sorted, target) {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left = left + 1;
    } else {
      right = right - 1;
    }
  }
  return [];
}`,
    `function removeDuplicates(sorted) {
  if (sorted.length === 0) {
    return 0;
  }
  let k = 1;
  for (let i = 1; i < sorted.length; i++) {
    const lastKept = sorted[k - 1];
    if (sorted[i] !== lastKept) {
      sorted[k] = sorted[i];
      k = k + 1;
    }
  }
  return k;
}`,
    `function isSubsequence(small, big) {
  const wanted = Array.from(small);
  let i = 0;
  let j = 0;
  while (i < wanted.length && j < big.length) {
    const point = big.codePointAt(j);
    const char = String.fromCodePoint(point);
    if (wanted[i] === char) i += 1;
    j += point > 0xffff ? 2 : 1;
  }
  return i === wanted.length;
}`,
    `function minWindowSum(numbers, target) {
  let best = 0;
  let sum = 0;
  let left = 0;
  for (let right = 0; right < numbers.length; right++) {
    sum = sum + numbers[right];
    while (sum >= target) {
      const length = right - left + 1;
      if (best === 0 || length < best) {
        best = length;
      }
      sum = sum - numbers[left];
      left = left + 1;
    }
  }
  return best;
}`,
    `function longestOnes(bits, k) {
  let best = 0;
  let zeros = 0;
  let left = 0;
  for (let right = 0; right < bits.length; right++) {
    if (bits[right] === 0) {
      zeros = zeros + 1;
    }
    while (zeros > k) {
      if (bits[left] === 0) {
        zeros = zeros - 1;
      }
      left = left + 1;
    }
    const width = right - left + 1;
    if (width > best) {
      best = width;
    }
  }
  return best;
}`,
  ],
  senior: [
    `const pairWithSum = (sorted, target) => {
  let [left, right] = [0, sorted.length - 1];
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return [];
};`,
    `const removeDuplicates = (sorted) => {
  let slow = 0;
  for (const value of sorted) {
    if (slow === 0 || value !== sorted[slow - 1]) sorted[slow++] = value;
  }
  return slow;
};`,
    `const isSubsequence = (small, big) => {
  const wanted = Array.from(small);
  let i = 0;
  for (const char of big) if (char === wanted[i]) i++;
  return i === wanted.length;
};`,
    `const minWindowSum = (numbers, target) => {
  let [best, sum, left] = [Infinity, 0, 0];
  numbers.forEach((value, right) => {
    sum += value;
    for (; sum >= target; left++) {
      best = Math.min(best, right - left + 1);
      sum -= numbers[left];
    }
  });
  return Number.isFinite(best) ? best : 0;
};`,
    `const longestOnes = (bits, k) => {
  let [left, zeros, best] = [0, 0, 0];
  bits.forEach((bit, right) => {
    zeros += bit === 0 ? 1 : 0;
    while (zeros > k) zeros -= bits[left++] === 0 ? 1 : 0;
    best = Math.max(best, right - left + 1);
  });
  return best;
};`,
  ],
};

const STACKS: Boards = {
  reference: [
    `function simplifyPath(path) {
  const stack = [];
  for (const part of path.split("/")) {
    // Empty parts come from repeated slashes and the ends; "." stays put.
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop(); // popping an empty stack keeps us at the root
    else stack.push(part);
  }
  return "/" + stack.join("/");
}`,
    `function evalRPN(tokens) {
  const apply = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => Math.trunc(a / b),
  };
  const stack = [];
  for (const token of tokens) {
    if (token in apply) {
      // The right operand was pushed last, so it comes off first.
      const right = stack.pop();
      const left = stack.pop();
      stack.push(apply[token](left, right));
    } else {
      stack.push(Number(token));
    }
  }
  return stack.pop();
}`,
    `function nextGreater(numbers) {
  const answer = numbers.map(() => -1);
  const waiting = []; // indices still looking; their values never rise bottom to top
  for (let i = 0; i < numbers.length; i += 1) {
    while (waiting.length > 0 && numbers[waiting[waiting.length - 1]] < numbers[i]) {
      answer[waiting.pop()] = numbers[i];
    }
    waiting.push(i);
  }
  return answer;
}`,
    `function decodeString(text) {
  const stack = [];
  let parts = [];
  let count = 0;
  for (const char of text) {
    if (char >= "0" && char <= "9") count = count * 10 + Number(char);
    else if (char === "[") {
      stack.push({ parts, times: count });
      parts = [];
      count = 0;
    } else if (char === "]") {
      const body = parts.join("");
      const parent = stack.pop();
      parts = parent.parts;
      parts.push(body.repeat(parent.times));
    } else parts.push(char);
  }
  return parts.join("");
}`,
    `function slidingMax(numbers, k) {
  const result = [];
  const queue = []; // indices; their values fall from front to back
  let front = 0; // queue[front] is the front, so dropping it costs O(1)
  for (let i = 0; i < numbers.length; i += 1) {
    // The front slid out of the window.
    if (front < queue.length && queue[front] <= i - k) front += 1;
    // A value not larger than the new one can never be a window's maximum again.
    while (queue.length > front && numbers[queue[queue.length - 1]] <= numbers[i]) queue.pop();
    queue.push(i);
    if (i >= k - 1) result.push(numbers[queue[front]]);
  }
  return result;
}`,
  ],
  junior: [
    `function simplifyPath(path) {
  const parts = path.split("/");
  const stack = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      if (stack.length > 0) {
        stack.pop();
      }
    } else {
      stack.push(part);
    }
  }
  return "/" + stack.join("/");
}`,
    `function evalRPN(tokens) {
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "+" || token === "-" || token === "*" || token === "/") {
      const right = stack.pop();
      const left = stack.pop();
      let result;
      if (token === "+") {
        result = left + right;
      } else if (token === "-") {
        result = left - right;
      } else if (token === "*") {
        result = left * right;
      } else {
        result = Math.trunc(left / right);
      }
      stack.push(result);
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}`,
    `function nextGreater(numbers) {
  const answer = [];
  for (let i = 0; i < numbers.length; i++) {
    answer.push(-1);
  }
  const waiting = [];
  for (let i = 0; i < numbers.length; i++) {
    const value = numbers[i];
    while (waiting.length > 0) {
      const top = waiting[waiting.length - 1];
      if (numbers[top] >= value) {
        break;
      }
      answer[top] = value;
      waiting.pop();
    }
    waiting.push(i);
  }
  return answer;
}`,
    `function decodeString(text) {
  let position = 0;
  function readGroup() {
    const parts = [];
    while (position < text.length && text[position] !== "]") {
      const char = text[position];
      if (char >= "0" && char <= "9") {
        let times = 0;
        while (text[position] >= "0" && text[position] <= "9") {
          times = times * 10 + Number(text[position++]);
        }
        position++; // opening bracket
        const body = readGroup();
        position++; // closing bracket
        parts.push(body.repeat(times));
      } else {
        parts.push(char);
        position++;
      }
    }
    return parts.join("");
  }
  return readGroup();
}`,
    `function slidingMax(numbers, k) {
  const result = [];
  const queue = [];
  let front = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (front < queue.length && queue[front] <= i - k) front++;
    while (queue.length > front && numbers[queue[queue.length - 1]] <= numbers[i]) queue.pop();
    queue.push(i);
    if (i >= k - 1) result.push(numbers[queue[front]]);
  }
  return result;
}`,
  ],
  senior: [
    `const simplifyPath = (path) =>
  "/" +
  path
    .split("/")
    .reduce((stack, part) => {
      if (part === "..") stack.pop();
      else if (part !== "" && part !== ".") stack.push(part);
      return stack;
    }, [])
    .join("/");`,
    `const OPERATORS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => Math.trunc(a / b),
};

const evalRPN = (tokens) =>
  tokens
    .reduce((stack, token) => {
      if (token in OPERATORS) {
        const right = stack.pop();
        stack.push(OPERATORS[token](stack.pop(), right));
      } else {
        stack.push(Number(token));
      }
      return stack;
    }, [])
    .pop();`,
    `const nextGreater = (numbers) => {
  const answer = new Array(numbers.length).fill(-1);
  const waiting = [];
  numbers.forEach((value, i) => {
    while (waiting.length && numbers[waiting[waiting.length - 1]] < value) answer[waiting.pop()] = value;
    waiting.push(i);
  });
  return answer;
};`,
    `const decodeString = (text) => {
  const frames = [{ chunks: [], times: 1 }];
  let count = 0;
  for (const char of text) {
    if (char >= "0" && char <= "9") count = count * 10 + Number(char);
    else if (char === "[") {
      frames.push({ chunks: [], times: count });
      count = 0;
    } else if (char === "]") {
      const child = frames.pop();
      frames[frames.length - 1].chunks.push(child.chunks.join("").repeat(child.times));
    } else frames[frames.length - 1].chunks.push(char);
  }
  return frames[0].chunks.join("");
};`,
    `const slidingMax = (numbers, k) => {
  const queue = [];
  const result = [];
  let front = 0;
  for (const [i, value] of numbers.entries()) {
    if (front < queue.length && queue[front] <= i - k) front++;
    while (queue.length > front && numbers[queue[queue.length - 1]] <= value) queue.pop();
    queue.push(i);
    if (i >= k - 1) result.push(numbers[queue[front]]);
  }
  return result;
};`,
  ],
};

const HIDDEN: Record<string, Hidden> = {
  'alg-path-pointers': [
    [["(() => {const values=[-3,-1,0,2,5,8];for(let mask=0;mask<64;mask++){const input=Object.freeze(values.filter((_,i)=>mask&(1<<i)));for(let target=-7;target<=16;target++){let expected=[];outer:for(let i=0;i<input.length;i++)for(let j=i+1;j<input.length;j++)if(input[i]+input[j]===target){expected=[i,j];break outer;}const actual=pairWithSum(input,target);if(!Array.isArray(actual)||actual.length!==expected.length||!actual.every((v,i)=>v===expected[i]))return false;}}return true;})()", true], ["(() => {const input=[-0,4294967296],copy=input.slice(),a=pairWithSum(input,4294967296),b=pairWithSum(input,4294967296),x=pairWithSum([],0),y=pairWithSum([],0);if(a===b||x===y||a===input||a[0]!==0||a[1]!==1||x.length||y.length)return false;a[0]=99;return b[0]===0&&input.every((v,i)=>Object.is(v,copy[i]))&&pairWithSum(Object.freeze([0,4294967296]),0).length===0&&pairWithSum(Object.freeze([-1000000000000,1000000000000]),0)[0]===0;})()", true], ["(() => {const input=Object.freeze(Array.from({length:20000},(_,i)=>i-10000)),high=Object.freeze(Array.from({length:20000},(_,i)=>i*1000000));return [pairWithSum(input,-1),pairWithSum(high,39997000000),pairWithSum(input,2000000000000)];})()", [[0, 19999], [19998, 19999], []]], ["pairWithSum([-3, -2, 0, 1, 4], -5)", [0, 1]], ["pairWithSum([2, 5, 9, 14], 23)", [2, 3]]],
    [["(() => {const values=[-Infinity,-0,0,.5,Infinity];for(let n=0;n<=4;n++)for(let code=0;code<5**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(values[digits%5]);digits=Math.floor(digits/5);}input.sort((a,b)=>a<b?-1:a>b?1:0);const expected=[];for(const value of input)if(!expected.length||expected[expected.length-1]!==value)expected.push(value);const k=removeDuplicates(input);if(!Number.isInteger(k)||k!==expected.length||input.length<k||!expected.every((v,i)=>Object.is(v,input[i])))return false;}return true;})()", true], ["(() => {const input=[-Infinity,-Infinity,-0,0,.25,.25,Infinity],k=removeDuplicates(input);return [k,input.length>=k,input[0]===-Infinity,Object.is(input[1],-0),input[2]===.25,input[3]===Infinity,removeDuplicates([])];})()", [4, true, true, true, true, true, 0]], ["(() => {const unique=Array.from({length:20000},(_,i)=>i/10),same=Array(20000).fill(-0),a=removeDuplicates(unique),b=removeDuplicates(same);return a===20000&&unique.every((v,i)=>v===i/10)&&b===1&&Object.is(same[0],-0);})()", true], ["(() => { const a = [3, 3, 3, 3, 4]; const k = removeDuplicates(a); return a.slice(0, k); })()", [3, 4]], ["removeDuplicates([1, 1])", 1]],
    [["(() => {const strings=[\"\"],alphabet=[\"a\",\"b\",\"😀\"];let frontier=[\"\"];for(let n=1;n<=3;n++){frontier=frontier.flatMap(prefix=>alphabet.map(char=>prefix+char));strings.push(...frontier);}for(const small of strings)for(const big of strings){const a=[...small],b=[...big],table=Array.from({length:a.length+1},()=>Array(b.length+1).fill(false));for(let j=0;j<=b.length;j++)table[0][j]=true;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)table[i][j]=table[i][j-1]||a[i-1]===b[j-1]&&table[i-1][j-1];if(isSubsequence(small,big)!==table[a.length][b.length])return false;}return true;})()", true], ["[isSubsequence(\"😀\",\"x😀y\"),isSubsequence(\"\\ud83d\",\"😀\"),isSubsequence(\"😀\",\"\\ud83dx\\ude00\"),isSubsequence(\"\\ud83d\",\"x\\ud83dy\"),isSubsequence(\"é\",\"e\\u0301\"),isSubsequence(\"\",\"😀\")]", [true, false, false, true, false, true]], ["[isSubsequence(\"😀\".repeat(10000),\"😀\".repeat(10000)),isSubsequence(\"a\".repeat(20000),\"a\".repeat(19999)),isSubsequence(\"ab\".repeat(10000),\"a\".repeat(20000)),isSubsequence(\"\",\"x\".repeat(20000))]", [true, false, false, true]], ["isSubsequence(\"abc\", \"ahbgdc\")", true], ["isSubsequence(\"axc\", \"ahbgdc\")", false]],
    [["(() => {const alphabet=[1,2,4,7];for(let n=0;n<=5;n++)for(let code=0;code<4**n;code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%4]);digits=Math.floor(digits/4);}Object.freeze(values);for(let target=1;target<=20;target++){let best=Infinity;for(let left=0;left<n;left++){let sum=0;for(let right=left;right<n;right++){sum+=values[right];if(sum>=target)best=Math.min(best,right-left+1);}}const expected=best===Infinity?0:best;if(minWindowSum(values,target)!==expected)return false;}}return true;})()", true], ["(() => {const values=[1000000000,1000000000,1000000000],copy=values.slice();return [minWindowSum(values,3000000000),values.every((v,i)=>Object.is(v,copy[i])),minWindowSum(Object.freeze(values.slice()),3000000001),minWindowSum(Object.freeze([]),1)];})()", [3, true, 0, 0]], ["[minWindowSum(Object.freeze(Array(20000).fill(1)),20000),minWindowSum(Object.freeze(Array(20000).fill(1000000000)),20000000000000),minWindowSum(Object.freeze(Array(20000).fill(1000000000)),100000000000000)]", [20000, 20000, 0]], ["minWindowSum([1, 2, 3], 7)", 0], ["minWindowSum([3, 1, 1, 1, 5], 6)", 2]],
    [["(() => {for(let n=0;n<=8;n++)for(let code=0;code<2**n;code++){const bits=Object.freeze(Array.from({length:n},(_,i)=>(code>>i)&1));for(let k=0;k<=n+1;k++){let best=0;for(let left=0;left<n;left++){let zeros=0;for(let right=left;right<n;right++){zeros+=bits[right]===0?1:0;if(zeros<=k)best=Math.max(best,right-left+1);}}if(longestOnes(bits,k)!==best)return false;}}return true;})()", true], ["(() => {const bits=[-0,1,-0],copy=bits.slice();return [longestOnes(bits,1),bits.every((v,i)=>Object.is(v,copy[i])),longestOnes(Object.freeze(bits.slice()),1099511627776),longestOnes(Object.freeze([1,0]),-0),longestOnes(Object.freeze([]),1099511627776)];})()", [2, true, 3, 1, 0]], ["[longestOnes(Object.freeze(Array(20000).fill(0)),10000),longestOnes(Object.freeze(Array(20000).fill(1)),0),longestOnes(Object.freeze(Array.from({length:20000},(_,i)=>i%2)),1),longestOnes(Object.freeze(Array(20000).fill(0)),1099511627776)]", [10000, 20000, 3, 20000]], ["longestOnes([0], 1)", 1], ["longestOnes([1, 0, 0, 1], 1)", 2]],
  ],
  'alg-path-stacks': [
    [["(() => {const names=['a','..','.','',' b ','...'];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code,path='',expected='';for(let i=0;i<n;i++){const part=names[digits%6];digits=Math.floor(digits/6);path+='/'+part;if(part==='..')expected=expected.slice(0,Math.max(0,expected.lastIndexOf('/')));else if(part!==''&&part!=='.')expected+='/'+part;}if(simplifyPath(path||'/')!==(expected||'/'))return false;}return true;})()", true], ["[simplifyPath('/ a /.. /'),simplifyPath('/A/%2e%2e/\\\\/\ud83d\ude00/\\ud83d'),simplifyPath('/__proto__/constructor'),simplifyPath('/../../x'),simplifyPath('/.../..hidden/.file')]", ["/ a /.. ", "/A/%2e%2e/\\/\ud83d\ude00/\ud83d", "/__proto__/constructor", "/x", "/.../..hidden/.file"]], ["(() => {const path='/'+'a/'.repeat(9999)+'a';return path.length===20000&&simplifyPath(path)===path&&simplifyPath('/'+'../'.repeat(6666))==='/';})()", true], ["simplifyPath(\"/a//b////c/d//././/..\")", "/a/b/c"], ["simplifyPath(\"/..hidden/\")", "/..hidden"]],
    [["(() => {const values=[-3n,-1n,0n,2n,5n],ops=['+','-','*','/'];const apply=(a,b,op)=>op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;for(const a of values)for(const b of values)for(const op of ops){if(op==='/'&&b===0n)continue;const tokens=Object.freeze([String(a),String(b),op]);if(evalRPN(tokens)!==Number(apply(a,b,op)))return false;}for(const a of values)for(const b of values)for(const c of values)for(const op of ops)for(const end of ops){if(!(op==='/'&&b===0n)){const first=apply(a,b,op);if(!(end==='/'&&c===0n)&&evalRPN(Object.freeze([String(a),String(b),op,String(c),end]))!==Number(apply(first,c,end)))return false;}if(!(end==='/'&&c===0n)){const last=apply(b,c,end);if(!(op==='/'&&last===0n)&&evalRPN(Object.freeze([String(a),String(b),String(c),end,op]))!==Number(apply(a,last,op)))return false;}}return true;})()", true], ["(() => {const tokens=['9007199254740991','1','-'],copy=tokens.slice();return evalRPN(tokens)===9007199254740990&&tokens.every((v,i)=>v===copy[i])&&evalRPN(Object.freeze(['4294967296','1','+']))===4294967297&&evalRPN(Object.freeze(['-7','2','/']))===-3&&evalRPN(Object.freeze(['-0']))===0;})()", true], ["(() => {const left=['1'];for(let i=1;i<10000;i++)left.push('1','+');const deep=Array(10000).fill('1').concat(Array(9999).fill('+'));return left.length===19999&&evalRPN(Object.freeze(left))===10000&&evalRPN(Object.freeze(deep))===10000;})()", true], ["evalRPN([\"2\", \"3\", \"4\", \"*\", \"+\"])", 14], ["evalRPN([\"-3\", \"-4\", \"*\"])", 12]],
    [["(() => {const values=[-2,-.5,-0,0,.25,3];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(values[digits%6]);digits=Math.floor(digits/6);}Object.freeze(input);const expected=input.map((value,i)=>{for(let j=i+1;j<n;j++)if(input[j]>value)return input[j];return -1;});const out=nextGreater(input);if(!Array.isArray(out)||out.length!==n||!out.every((v,i)=>v===expected[i]))return false;}return true;})()", true], ["(() => {const input=[-Infinity,-0,0,.5,Infinity,Infinity],copy=input.slice(),a=nextGreater(input),b=nextGreater(Object.freeze(input.slice())),x=nextGreater([]),y=nextGreater([]),expected=[-0,.5,.5,Infinity,-1,-1];if(a===input||a===b||x===y||x.length||y.length||!a.every((v,i)=>v===expected[i])||!b.every((v,i)=>v===expected[i]))return false;a[0]=99;return a[0]===99&&b[0]===0&&input.every((v,i)=>Object.is(v,copy[i]));})()", true], ["(() => {const increasing=Object.freeze(Array.from({length:20000},(_,i)=>i)),falling=Object.freeze(Array.from({length:20000},(_,i)=>20000-i));return nextGreater(increasing).every((v,i)=>v===(i===19999?-1:i+1))&&nextGreater(falling).every(v=>v===-1)&&nextGreater(Object.freeze(Array(20000).fill(.5))).every(v=>v===-1);})()", true], ["nextGreater([2, 7, 3, 5, 4, 6, 8])", [7, 8, 5, 6, 6, 8, -1]], ["nextGreater([1, 1, 2])", [2, 2, -1]]],
    [["(() => {const chunks=[['a','a'],['2[b]','bb'],['3[]',''],['2[c2[d]]','cddcdd'],['1[\ud83d\ude00]','\ud83d\ude00'],[' a ',' a ']];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code,input='',expected='';for(let i=0;i<n;i++){const pair=chunks[digits%6];digits=Math.floor(digits/6);input+=pair[0];expected+=pair[1];}if(decodeString(input)!==expected)return false;}return true;})()", true], ["decodeString('2[ a ]')===' a  a '&&decodeString('1['.repeat(64)+'\ud83d\ude00\\ud83d'+']'.repeat(64))==='\ud83d\ude00\\ud83d'&&decodeString('1000['.repeat(64)+']'.repeat(64))===''&&decodeString('2[\u00e9\\u0301]')==='\u00e9\\u0301\u00e9\\u0301' ", true], ["decodeString('1[a]'.repeat(5000))==='a'.repeat(5000)&&decodeString('1000[20[a]]')==='a'.repeat(20000)&&decodeString('3[]'.repeat(5000))==='' ", true], ["decodeString(\"2[a2[b]c]\")", "abbcabbc"], ["decodeString(\"12[q]\")", "qqqqqqqqqqqq"]],
    [["(() => {const values=[-2,-.5,-0,0,.25,3];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(values[digits%6]);digits=Math.floor(digits/6);}Object.freeze(input);for(let k=1;k<=n+1;k++){const expected=[];for(let left=0;left+k<=n;left++){let best=-Infinity;for(let j=left;j<left+k;j++)best=Math.max(best,input[j]);expected.push(best);}const out=slidingMax(input,k);if(!Array.isArray(out)||out.length!==expected.length||!out.every((v,i)=>v===expected[i]))return false;}}return true;})()", true], ["(() => {const input=[-Infinity,-0,0,.5,Infinity],copy=input.slice(),a=slidingMax(input,2),b=slidingMax(Object.freeze(input.slice()),2),x=slidingMax(input,1099511627776),y=slidingMax(input,1099511627776),expected=[0,0,.5,Infinity];if(a===input||a===b||x===y||x.length||y.length||a.length!==4||b.length!==4||!a.every((v,i)=>v===expected[i])||!b.every((v,i)=>v===expected[i]))return false;a[0]=99;return a[0]===99&&b[0]===0&&input.every((v,i)=>Object.is(v,copy[i]))&&slidingMax([],1).length===0;})()", true], ["(() => {const down=Object.freeze(Array.from({length:20000},(_,i)=>20000-i)),up=Object.freeze(Array.from({length:20000},(_,i)=>i)),a=slidingMax(down,10000),b=slidingMax(up,10000),c=slidingMax(Object.freeze(Array(20000).fill(.5)),10000);return a.length===10001&&a.every((v,i)=>v===20000-i)&&b.length===10001&&b.every((v,i)=>v===i+9999)&&c.length===10001&&c.every(v=>v===.5);})()", true], ["slidingMax([7, 2, 4], 2)", [7, 4]], ["slidingMax([1, -1], 1)", [1, -1]]],
  ],
};

export const ALGORITHM_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...cumulativeLevels('alg-path-pointers', POINTERS, HIDDEN['alg-path-pointers']),
  ...cumulativeLevels('alg-path-stacks', STACKS, HIDDEN['alg-path-stacks']),
]);
