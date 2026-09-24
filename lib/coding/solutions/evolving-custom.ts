/** Server-only solutions for the Custom category (`js-custom-mapset` and
 * `js-custom-catalog`).
 *
 * Every stage adds a checkpoint function and a milestone function to the same
 * file, so a stage's solution is every earlier stage's functions plus its own.
 * The junior board writes each step out with plain loops; the senior board
 * uses the built-in that fits. The content contract proves all three against
 * every visible and hidden check. */

import type { CodingSolution } from '../types';
import { CUSTOM_CATALOG_ID, CUSTOM_MAPSET_ID } from '../tasks/evolving-custom';

interface Boards { reference: string[]; junior: string[]; senior: string[] }

const MAPSET: Boards = {
  reference: [
    `function unique(items) {
  // A Set keeps the first copy of each value, in insertion order.
  return [...new Set(items)];
}

function common(a, b) {
  const inB = new Set(b);
  const added = new Set();
  const result = [];
  for (const value of a) {
    if (inB.has(value) && !added.has(value)) {
      added.add(value);
      result.push(value);
    }
  }
  return result;
}`,
    `function countAll(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function mostCommon(items) {
  let best = null;
  let bestCount = 0;
  // Strictly greater, so the first value seen wins a tie.
  for (const [value, count] of countAll(items)) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}`,
    `function firstRepeat(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) return item;
    seen.add(item);
  }
  return null;
}

function twoSum(numbers, target) {
  const seen = new Map(); // value -> index
  for (let i = 0; i < numbers.length; i += 1) {
    const need = target - numbers[i];
    if (seen.has(need)) return [seen.get(need), i];
    // Store after the lookup, so a value never pairs with itself.
    if (!seen.has(numbers[i])) seen.set(numbers[i], i);
  }
  return [];
}`,
    `function countsToPairs(counts) {
  // sort is stable, so equal counts keep the Map's order.
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function topK(items, k) {
  return countsToPairs(countAll(items)).slice(0, k).map(([value]) => value);
}`,
    `function firstUnique(text) {
  const counts = countAll([...text]);
  for (const char of text) {
    if (counts.get(char) === 1) return char;
  }
  return null;
}

function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}`,
  ],
  junior: [
    `function unique(items) {
  const seen = new Set();
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function common(a, b) {
  const inB = new Set(b);
  const added = new Set();
  const result = [];
  for (let i = 0; i < a.length; i++) {
    const value = a[i];
    if (!inB.has(value)) continue;
    if (added.has(value)) continue;
    added.add(value);
    result.push(value);
  }
  return result;
}`,
    `function countAll(items) {
  const counts = new Map();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (counts.has(item)) {
      counts.set(item, counts.get(item) + 1);
    } else {
      counts.set(item, 1);
    }
  }
  return counts;
}

function mostCommon(items) {
  const counts = countAll(items);
  let best = null;
  let bestCount = 0;
  for (const entry of counts) {
    const value = entry[0];
    const count = entry[1];
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}`,
    `function firstRepeat(items) {
  const seen = new Set();
  for (let i = 0; i < items.length; i++) {
    if (seen.has(items[i])) {
      return items[i];
    }
    seen.add(items[i]);
  }
  return null;
}

function twoSum(numbers, target) {
  const indexOfValue = new Map();
  for (let i = 0; i < numbers.length; i++) {
    const value = numbers[i];
    const partner = target - value;
    if (indexOfValue.has(partner)) {
      return [indexOfValue.get(partner), i];
    }
    if (!indexOfValue.has(value)) {
      indexOfValue.set(value, i);
    }
  }
  return [];
}`,
    `function countsToPairs(counts) {
  const pairs = [];
  for (const entry of counts) {
    pairs.push([entry[0], entry[1]]);
  }
  pairs.sort(function (a, b) {
    return b[1] - a[1];
  });
  return pairs;
}

function topK(items, k) {
  const pairs = countsToPairs(countAll(items));
  const result = [];
  for (let i = 0; i < pairs.length && i < k; i++) {
    result.push(pairs[i][0]);
  }
  return result;
}`,
    `function firstUnique(text) {
  const counts = countAll(text.split(""));
  for (let i = 0; i < text.length; i++) {
    if (counts.get(text[i]) === 1) {
      return text[i];
    }
  }
  return null;
}

function groupAnagrams(words) {
  const groups = new Map();
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const key = word.split("").sort().join("");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(word);
  }
  const result = [];
  for (const group of groups.values()) {
    result.push(group);
  }
  return result;
}`,
  ],
  senior: [
    `const unique = (items) => [...new Set(items)];

function common(a, b) {
  const inB = new Set(b);
  return unique(a.filter((value) => inB.has(value)));
}`,
    `const countAll = (items) =>
  items.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map());

function mostCommon(items) {
  let best = null;
  let bestCount = 0;
  for (const [value, count] of countAll(items)) {
    if (count > bestCount) [best, bestCount] = [value, count];
  }
  return best;
}`,
    `function firstRepeat(items) {
  const seen = new Set();
  return items.find((item) => seen.has(item) || !seen.add(item)) ?? null;
}

function twoSum(numbers, target) {
  const seen = new Map();
  for (const [i, value] of numbers.entries()) {
    if (seen.has(target - value)) return [seen.get(target - value), i];
    if (!seen.has(value)) seen.set(value, i);
  }
  return [];
}`,
    `const countsToPairs = (counts) => [...counts.entries()].sort(([, a], [, b]) => b - a);

const topK = (items, k) => countsToPairs(countAll(items)).slice(0, k).map(([value]) => value);`,
    `function firstUnique(text) {
  const counts = countAll([...text]);
  return [...text].find((char) => counts.get(char) === 1) ?? null;
}

function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    groups.set(key, [...(groups.get(key) ?? []), word]);
  }
  return [...groups.values()];
}`,
  ],
};

const CATALOG: Boards = {
  reference: [
    `function countByCategory(list) {
  const counts = {};
  for (const record of list) {
    counts[record.category] = (counts[record.category] ?? 0) + 1;
  }
  return counts;
}

function groupByCategory(list) {
  const groups = {};
  for (const record of list) {
    // New key: create the empty group first. Then push.
    if (!groups[record.category]) groups[record.category] = [];
    groups[record.category].push(record.name);
  }
  return groups;
}`,
    `function totalRuns(list) {
  const totals = {};
  for (const record of list) {
    totals[record.category] = (totals[record.category] ?? 0) + record.runs;
  }
  return totals;
}

function summarize(list) {
  const out = {};
  const bestRating = {};
  for (const record of list) {
    const key = record.category;
    if (!out[key]) {
      out[key] = { count: 0, runs: 0, best: record.name };
      bestRating[key] = record.rating;
    }
    out[key].count += 1;
    out[key].runs += record.runs;
    // Strictly higher, so the first record wins a tie.
    if (record.rating > bestRating[key]) {
      out[key].best = record.name;
      bestRating[key] = record.rating;
    }
  }
  return out;
}`,
    `function sortActors(list) {
  return [...list].sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name));
}

function topPerCategory(list, k) {
  const out = {};
  for (const record of sortActors(list)) {
    if (!out[record.category]) out[record.category] = [];
    if (out[record.category].length < k) out[record.category].push(record.name);
  }
  return out;
}`,
    `function indexById(list) {
  return new Map(list.map((record) => [record.id, record]));
}

function diffCatalog(before, after) {
  const old = indexById(before);
  const now = indexById(after);
  const added = [];
  const changed = [];
  for (const record of after) {
    if (!old.has(record.id)) added.push(record.id);
    else if (old.get(record.id).runs !== record.runs) changed.push(record.id);
  }
  const removed = before.filter((record) => !now.has(record.id)).map((record) => record.id);
  return { added, removed, changed };
}`,
    `function linksToGraph(links) {
  const graph = {};
  for (const [from, to] of links) {
    if (!graph[from]) graph[from] = [];
    if (!graph[from].includes(to)) graph[from].push(to);
  }
  return graph;
}

function crawlOrder(links, start) {
  const graph = linksToGraph(links);
  const queue = [start];
  const visited = new Set([start]);
  const order = [];
  while (queue.length > 0) {
    const page = queue.shift();
    order.push(page);
    for (const next of graph[page] ?? []) {
      // Mark when queued, so no page is queued twice.
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}`,
  ],
  junior: [
    `function countByCategory(list) {
  const counts = {};
  for (let i = 0; i < list.length; i++) {
    const category = list[i].category;
    if (counts[category] === undefined) {
      counts[category] = 0;
    }
    counts[category] = counts[category] + 1;
  }
  return counts;
}

function groupByCategory(list) {
  const groups = {};
  for (let i = 0; i < list.length; i++) {
    const category = list[i].category;
    if (groups[category] === undefined) {
      groups[category] = [];
    }
    groups[category].push(list[i].name);
  }
  return groups;
}`,
    `function totalRuns(list) {
  const totals = {};
  for (let i = 0; i < list.length; i++) {
    const category = list[i].category;
    if (totals[category] === undefined) {
      totals[category] = 0;
    }
    totals[category] = totals[category] + list[i].runs;
  }
  return totals;
}

function summarize(list) {
  const out = {};
  const bestRating = {};
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const category = record.category;
    if (out[category] === undefined) {
      out[category] = { count: 0, runs: 0, best: record.name };
      bestRating[category] = record.rating;
    }
    out[category].count = out[category].count + 1;
    out[category].runs = out[category].runs + record.runs;
    if (record.rating > bestRating[category]) {
      out[category].best = record.name;
      bestRating[category] = record.rating;
    }
  }
  return out;
}`,
    `function sortActors(list) {
  const copy = list.slice();
  copy.sort(function (a, b) {
    if (a.runs !== b.runs) {
      return b.runs - a.runs;
    }
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  return copy;
}

function topPerCategory(list, k) {
  const sorted = sortActors(list);
  const out = {};
  for (let i = 0; i < sorted.length; i++) {
    const category = sorted[i].category;
    if (out[category] === undefined) {
      out[category] = [];
    }
    if (out[category].length < k) {
      out[category].push(sorted[i].name);
    }
  }
  return out;
}`,
    `function indexById(list) {
  const byId = new Map();
  for (let i = 0; i < list.length; i++) {
    byId.set(list[i].id, list[i]);
  }
  return byId;
}

function diffCatalog(before, after) {
  const oldById = indexById(before);
  const newById = indexById(after);
  const added = [];
  const removed = [];
  const changed = [];
  for (let i = 0; i < after.length; i++) {
    const record = after[i];
    if (!oldById.has(record.id)) {
      added.push(record.id);
    } else if (oldById.get(record.id).runs !== record.runs) {
      changed.push(record.id);
    }
  }
  for (let i = 0; i < before.length; i++) {
    if (!newById.has(before[i].id)) {
      removed.push(before[i].id);
    }
  }
  return { added: added, removed: removed, changed: changed };
}`,
    `function linksToGraph(links) {
  const graph = {};
  for (let i = 0; i < links.length; i++) {
    const from = links[i][0];
    const to = links[i][1];
    if (graph[from] === undefined) {
      graph[from] = [];
    }
    if (graph[from].indexOf(to) === -1) {
      graph[from].push(to);
    }
  }
  return graph;
}

function crawlOrder(links, start) {
  const graph = linksToGraph(links);
  const order = [];
  const queue = [start];
  const visited = new Set();
  visited.add(start);
  while (queue.length > 0) {
    const page = queue.shift();
    order.push(page);
    const neighbours = graph[page] || [];
    for (let i = 0; i < neighbours.length; i++) {
      const next = neighbours[i];
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}`,
  ],
  senior: [
    `function countByCategory(list) {
  return list.reduce((counts, { category }) => {
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

function groupByCategory(list) {
  const groups = {};
  for (const { name, category } of list) (groups[category] ??= []).push(name);
  return groups;
}`,
    `function totalRuns(list) {
  const totals = {};
  for (const { category, runs } of list) totals[category] = (totals[category] ?? 0) + runs;
  return totals;
}

function summarize(list) {
  const best = new Map();
  const out = {};
  for (const record of list) {
    const entry = (out[record.category] ??= { count: 0, runs: 0, best: record.name });
    entry.count += 1;
    entry.runs += record.runs;
    if (!best.has(record.category) || record.rating > best.get(record.category)) {
      best.set(record.category, record.rating);
      entry.best = record.name;
    }
  }
  return out;
}`,
    `const sortActors = (list) =>
  [...list].sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name));

function topPerCategory(list, k) {
  const out = {};
  for (const { category, name } of sortActors(list)) {
    const names = (out[category] ??= []);
    if (names.length < k) names.push(name);
  }
  return out;
}`,
    `const indexById = (list) => new Map(list.map((record) => [record.id, record]));

function diffCatalog(before, after) {
  const old = indexById(before);
  const now = indexById(after);
  return {
    added: after.filter(({ id }) => !old.has(id)).map(({ id }) => id),
    removed: before.filter(({ id }) => !now.has(id)).map(({ id }) => id),
    changed: after.filter(({ id, runs }) => old.has(id) && old.get(id).runs !== runs).map(({ id }) => id),
  };
}`,
    `function linksToGraph(links) {
  const sets = new Map();
  for (const [from, to] of links) {
    if (!sets.has(from)) sets.set(from, new Set());
    sets.get(from).add(to);
  }
  return Object.fromEntries([...sets].map(([from, targets]) => [from, [...targets]]));
}

function crawlOrder(links, start) {
  const graph = linksToGraph(links);
  const visited = new Set([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    for (const next of graph[queue[head]] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return queue;
}`,
  ],
};

/** Hidden checks per stage, from angles the visible ones do not take. */
const HIDDEN: Record<string, [string, unknown][][]> = {
  [CUSTOM_MAPSET_ID]: [
    [['unique([true, false, true])', [true, false]], ['common(["a", "b"], ["b", "a"])', ['a', 'b']]],
    [['[...countAll([0, 0, false])]', [[0, 2], [false, 1]]], ['mostCommon([3, 1, 1, 3, 2])', 3]],
    [['firstRepeat(["b", "a", "a", "b"])', 'a'], ['twoSum([0, 4, 0], 0)', [0, 2]], ['twoSum([1, 5, 9], 14)', [1, 2]]],
    [['countsToPairs(new Map([["a", 2], ["b", 2]]))', [['a', 2], ['b', 2]]], ['topK([5, 4, 4, 5, 3], 3)', [5, 4, 3]]],
    [['firstUnique("aabbc")', 'c'], ['groupAnagrams(["listen", "silent", "enlist", "google"])', [['listen', 'silent', 'enlist'], ['google']]]],
  ],
  [CUSTOM_CATALOG_ID]: [
    [['countByCategory([{category: "b"}, {category: "a"}]).b', 1], ['groupByCategory([{name: "A", category: "x"}, {name: "A", category: "x"}])', { x: ['A', 'A'] }]],
    [['totalRuns([{category: "a", runs: 1}, {category: "a", runs: 1}, {category: "a", runs: 1}]).a', 3], ['summarize([{name: "A", category: "x", runs: 1, rating: 1}, {name: "B", category: "x", runs: 1, rating: 2}, {name: "C", category: "x", runs: 1, rating: 2}]).x.best', 'B']],
    [['sortActors([{name: "b", runs: 0}, {name: "a", runs: 0}]).map((a) => a.name)', ['a', 'b']], ['topPerCategory([{name: "A", category: "x", runs: 1}, {name: "B", category: "y", runs: 2}], 1)', { x: ['A'], y: ['B'] }]],
    [['indexById([{id: "a", n: 1}]).get("a").n', 1], ['diffCatalog([{id: "a", runs: 1}, {id: "b", runs: 1}], [{id: "b", runs: 1}, {id: "a", runs: 2}])', { added: [], removed: [], changed: ['a'] }]],
    [['linksToGraph([["a", "b"], ["a", "c"], ["a", "b"]]).a', ['b', 'c']], ['crawlOrder([["a", "a"]], "a")', ['a']]],
  ],
};

function stages(id: string, boards: Boards): [string, CodingSolution][] {
  return [1, 2, 3, 4, 5].map((stage) => [`${id}-${stage}`, {
    solution: boards.reference.slice(0, stage).join('\n\n'),
    junior: boards.junior.slice(0, stage).join('\n\n'),
    senior: boards.senior.slice(0, stage).join('\n\n'),
    hiddenTests: HIDDEN[id].slice(0, stage).flat().map(([call, expected]) => ({ call, expected, edge: true })),
  }]);
}

export const CUSTOM_EVOLVING_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...stages(CUSTOM_MAPSET_ID, MAPSET),
  ...stages(CUSTOM_CATALOG_ID, CATALOG),
]);
