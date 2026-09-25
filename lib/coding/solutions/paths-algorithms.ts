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
  let i = 0; // how much of small is matched so far
  for (const char of big) {
    if (i < small.length && char === small[i]) i += 1;
  }
  return i === small.length;
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
  let i = 0;
  let j = 0;
  while (i < small.length && j < big.length) {
    if (small[i] === big[j]) {
      i = i + 1;
    }
    j = j + 1;
  }
  return i === small.length;
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
  let i = 0;
  for (const char of big) if (char === small[i]) i++;
  return i === small.length;
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
  const stack = []; // [the text before a bracket, how many times to repeat what is inside]
  let current = "";
  let count = 0;
  for (const char of text) {
    if (char >= "0" && char <= "9") {
      count = count * 10 + Number(char); // a count can have several digits
    } else if (char === "[") {
      stack.push([current, count]);
      current = "";
      count = 0;
    } else if (char === "]") {
      const [before, times] = stack.pop();
      current = before + current.repeat(times);
    } else {
      current += char;
    }
  }
  return current;
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
  const counts = [];
  const texts = [];
  let current = "";
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char >= "0" && char <= "9") {
      count = count * 10 + Number(char);
    } else if (char === "[") {
      counts.push(count);
      texts.push(current);
      count = 0;
      current = "";
    } else if (char === "]") {
      const times = counts.pop();
      const before = texts.pop();
      let repeated = "";
      for (let j = 0; j < times; j++) {
        repeated = repeated + current;
      }
      current = before + repeated;
    } else {
      current = current + char;
    }
  }
  return current;
}`,
    `function slidingMax(numbers, k) {
  const result = [];
  const queue = [];
  for (let i = 0; i < numbers.length; i++) {
    if (queue.length > 0 && queue[0] <= i - k) {
      queue.shift();
    }
    while (queue.length > 0 && numbers[queue[queue.length - 1]] <= numbers[i]) {
      queue.pop();
    }
    queue.push(i);
    if (i >= k - 1) {
      result.push(numbers[queue[0]]);
    }
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
  const stack = [];
  let current = "";
  let count = 0;
  for (const char of text) {
    if (/\\d/.test(char)) {
      count = count * 10 + Number(char);
    } else if (char === "[") {
      stack.push({ before: current, times: count });
      [current, count] = ["", 0];
    } else if (char === "]") {
      const { before, times } = stack.pop();
      current = before + current.repeat(times);
    } else {
      current += char;
    }
  }
  return current;
};`,
    `const slidingMax = (numbers, k) => {
  const queue = [];
  const result = [];
  for (const [i, value] of numbers.entries()) {
    if (queue[0] <= i - k) queue.shift();
    while (queue.length && numbers[queue[queue.length - 1]] <= value) queue.pop();
    queue.push(i);
    if (i >= k - 1) result.push(numbers[queue[0]]);
  }
  return result;
};`,
  ],
};

const HIDDEN: Record<string, Hidden> = {
  'alg-path-pointers': [
    [['pairWithSum([-3, -2, 0, 1, 4], -5)', [0, 1]], ['pairWithSum([2, 5, 9, 14], 23)', [2, 3]]],
    [['(() => { const a = [3, 3, 3, 3, 4]; const k = removeDuplicates(a); return a.slice(0, k); })()', [3, 4]], ['removeDuplicates([1, 1])', 1]],
    [['isSubsequence("abc", "ahbgdc")', true], ['isSubsequence("axc", "ahbgdc")', false]],
    [['minWindowSum([1, 2, 3], 7)', 0], ['minWindowSum([3, 1, 1, 1, 5], 6)', 2]],
    [['longestOnes([0], 1)', 1], ['longestOnes([1, 0, 0, 1], 1)', 2]],
  ],
  'alg-path-stacks': [
    [['simplifyPath("/a//b////c/d//././/..")', '/a/b/c'], ['simplifyPath("/..hidden/")', '/..hidden']],
    [['evalRPN(["2", "3", "4", "*", "+"])', 14], ['evalRPN(["-3", "-4", "*"])', 12]],
    [['nextGreater([2, 7, 3, 5, 4, 6, 8])', [7, 8, 5, 6, 6, 8, -1]], ['nextGreater([1, 1, 2])', [2, 2, -1]]],
    [['decodeString("2[a2[b]c]")', 'abbcabbc'], ['decodeString("12[q]")', 'qqqqqqqqqqqq']],
    [['slidingMax([7, 2, 4], 2)', [7, 4]], ['slidingMax([1, -1], 1)', [1, -1]]],
  ],
};

export const ALGORITHM_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...cumulativeLevels('alg-path-pointers', POINTERS, HIDDEN['alg-path-pointers']),
  ...cumulativeLevels('alg-path-stacks', STACKS, HIDDEN['alg-path-stacks']),
]);
