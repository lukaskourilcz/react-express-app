/** Server-only solutions for the JavaScript section's short paths.
 *
 * Every level adds functions to the same file, so a level's solution is every
 * earlier level's code plus its own. The junior board writes each step out
 * with plain loops; the senior board uses the built-in that fits. The content
 * contract proves all three against every visible and hidden check. */

import type { CodingSolution } from '../types';
import { cumulativeLevels, type Boards, type Hidden } from './path-boards';

const MAP: Boards = {
  reference: [
    `function countAll(items) {
  const counts = new Map();
  for (const item of items) {
    // ?? 0 starts a value you have not counted yet at zero.
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}`,
    `function mostCommon(items) {
  let best = null;
  let bestCount = 0;
  // Strictly greater, so the value seen first keeps a tie.
  for (const [value, count] of countAll(items)) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}`,
    `function twoSum(numbers, target) {
  const seen = new Map(); // value -> first index it appeared at
  for (let i = 0; i < numbers.length; i += 1) {
    const need = target - numbers[i];
    if (seen.has(need)) return [seen.get(need), i];
    // Store after the lookup, so a value never pairs with itself,
    // and only once, so the earliest index stays.
    if (!seen.has(numbers[i])) seen.set(numbers[i], i);
  }
  return [];
}`,
    `function topK(items, k) {
  // sort is stable, so equal counts keep their first-seen order.
  return [...countAll(items)]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([value]) => value);
}`,
    `function groupAnagrams(words) {
  const groups = new Map(); // sorted letters -> words
  for (const word of words) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}`,
  ],
  junior: [
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
}`,
    `function mostCommon(items) {
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
    `function twoSum(numbers, target) {
  const seen = new Map();
  for (let i = 0; i < numbers.length; i++) {
    const value = numbers[i];
    const need = target - value;
    if (seen.has(need)) {
      const j = seen.get(need);
      return [j, i];
    }
    if (!seen.has(value)) {
      seen.set(value, i);
    }
  }
  return [];
}`,
    `function topK(items, k) {
  const counts = countAll(items);
  const pairs = [];
  for (const entry of counts) {
    pairs.push(entry);
  }
  pairs.sort(function (a, b) {
    return b[1] - a[1];
  });
  const result = [];
  for (let i = 0; i < pairs.length && i < k; i++) {
    result.push(pairs[i][0]);
  }
  return result;
}`,
    `function groupAnagrams(words) {
  const groups = new Map();
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const letters = word.split("");
    letters.sort();
    const key = letters.join("");
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
    `const countAll = (items) =>
  items.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map());`,
    `const mostCommon = (items) =>
  [...countAll(items)].reduce((best, entry) => (entry[1] > best[1] ? entry : best), [null, 0])[0];`,
    `const twoSum = (numbers, target) => {
  const seen = new Map();
  for (const [i, value] of numbers.entries()) {
    if (seen.has(target - value)) return [seen.get(target - value), i];
    if (!seen.has(value)) seen.set(value, i);
  }
  return [];
};`,
    `const topK = (items, k) =>
  [...countAll(items)].sort(([, a], [, b]) => b - a).slice(0, k).map(([value]) => value);`,
    `const groupAnagrams = (words) => {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    (groups.get(key) ?? groups.set(key, []).get(key)).push(word);
  }
  return [...groups.values()];
};`,
  ],
};

const SET: Boards = {
  reference: [
    `function unique(items) {
  // A Set keeps the first copy of each value, in insertion order.
  return [...new Set(items)];
}`,
    `function common(a, b) {
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
    `function difference(a, b) {
  const inB = new Set(b);
  // Filter first, then let unique drop the repeats.
  return unique(a.filter((value) => !inB.has(value)));
}`,
    `function firstRepeat(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) return item;
    seen.add(item);
  }
  return null;
}`,
    `function duplicates(items) {
  const seen = new Set();
  const reported = new Set();
  for (const item of items) {
    // The second copy is the first time seen already has the value.
    if (seen.has(item)) reported.add(item);
    seen.add(item);
  }
  // A Set keeps insertion order: the order the second copies appeared.
  return [...reported];
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
}`,
    `function common(a, b) {
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
    `function difference(a, b) {
  const inB = new Set(b);
  const kept = [];
  for (let i = 0; i < a.length; i++) {
    if (!inB.has(a[i])) {
      kept.push(a[i]);
    }
  }
  return unique(kept);
}`,
    `function firstRepeat(items) {
  const seen = new Set();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return null;
}`,
    `function duplicates(items) {
  const seen = new Set();
  const reported = new Set();
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (seen.has(item)) {
      if (!reported.has(item)) {
        reported.add(item);
        result.push(item);
      }
    } else {
      seen.add(item);
    }
  }
  return result;
}`,
  ],
  senior: [
    `const unique = (items) => Array.from(new Set(items));`,
    `const common = (a, b) => {
  const inB = new Set(b);
  return unique(a.filter((value) => inB.has(value)));
};`,
    `const difference = (a, b) => {
  const inB = new Set(b);
  return [...new Set(a)].filter((value) => !inB.has(value));
};`,
    `const firstRepeat = (items) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.size === seen.add(item).size) return item;
  }
  return null;
};`,
    `const duplicates = (items) => {
  const seen = new Set();
  const reported = new Set();
  for (const item of items) (seen.has(item) ? reported : seen).add(item);
  return [...reported];
};`,
  ],
};

const MAP_AND_SET: Boards = {
  reference: [
    `function countWords(text, stopWords) {
  const stop = new Set(stopWords);
  const counts = new Map();
  for (const word of text.toLowerCase().split(/\\s+/)) {
    // split leaves "" at the ends when the text starts or ends with spaces.
    if (word === "" || stop.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}`,
    `function tagsByUser(events) {
  const users = new Map(); // user -> Set of tags
  for (const { user, tag } of events) {
    if (!users.has(user)) users.set(user, new Set());
    // add ignores a tag the Set already holds.
    users.get(user).add(tag);
  }
  return users;
}`,
    `function isIsomorphic(a, b) {
  if (a.length !== b.length) return false;
  const partner = new Map(); // character of a -> its character in b
  const taken = new Set(); // characters of b already given out
  for (let i = 0; i < a.length; i += 1) {
    if (partner.has(a[i])) {
      if (partner.get(a[i]) !== b[i]) return false;
    } else {
      // Two characters of a cannot share one partner.
      if (taken.has(b[i])) return false;
      partner.set(a[i], b[i]);
      taken.add(b[i]);
    }
  }
  return true;
}`,
    `function buildIndex(docs) {
  const index = new Map(); // word -> Set of doc ids
  for (const doc of docs) {
    // countWords' keys are the doc's distinct words, split the same way.
    for (const word of countWords(doc.text, []).keys()) {
      if (!index.has(word)) index.set(word, new Set());
      index.get(word).add(doc.id);
    }
  }
  return index;
}`,
    `function search(docs, query) {
  const words = [...countWords(query, []).keys()];
  if (words.length === 0) return [];
  const index = buildIndex(docs);
  const sets = words.map((word) => index.get(word));
  // A word the index does not have means no doc matches.
  if (sets.some((set) => set === undefined)) return [];
  const [first, ...rest] = sets;
  // Each Set holds ids in doc order, so filtering the first keeps that order.
  return [...first].filter((id) => rest.every((set) => set.has(id)));
}`,
  ],
  junior: [
    `function countWords(text, stopWords) {
  const stop = new Set(stopWords);
  const counts = new Map();
  const words = text.toLowerCase().split(/\\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === "") {
      continue;
    }
    if (stop.has(word)) {
      continue;
    }
    if (counts.has(word)) {
      counts.set(word, counts.get(word) + 1);
    } else {
      counts.set(word, 1);
    }
  }
  return counts;
}`,
    `function tagsByUser(events) {
  const users = new Map();
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!users.has(event.user)) {
      users.set(event.user, new Set());
    }
    const tags = users.get(event.user);
    tags.add(event.tag);
  }
  return users;
}`,
    `function isIsomorphic(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const partner = new Map();
  const taken = new Set();
  for (let i = 0; i < a.length; i++) {
    const from = a[i];
    const to = b[i];
    if (partner.has(from)) {
      if (partner.get(from) !== to) {
        return false;
      }
    } else {
      if (taken.has(to)) {
        return false;
      }
      partner.set(from, to);
      taken.add(to);
    }
  }
  return true;
}`,
    `function buildIndex(docs) {
  const index = new Map();
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const words = countWords(doc.text, []);
    for (const word of words.keys()) {
      if (!index.has(word)) {
        index.set(word, new Set());
      }
      index.get(word).add(doc.id);
    }
  }
  return index;
}`,
    `function search(docs, query) {
  const words = [];
  for (const word of countWords(query, []).keys()) {
    words.push(word);
  }
  if (words.length === 0) {
    return [];
  }
  const index = buildIndex(docs);
  for (let i = 0; i < words.length; i++) {
    if (!index.has(words[i])) {
      return [];
    }
  }
  const result = [];
  for (const id of index.get(words[0])) {
    let inEvery = true;
    for (let i = 1; i < words.length; i++) {
      if (!index.get(words[i]).has(id)) {
        inEvery = false;
      }
    }
    if (inEvery) {
      result.push(id);
    }
  }
  return result;
}`,
  ],
  senior: [
    `const countWords = (text, stopWords) => {
  const stop = new Set(stopWords);
  return text
    .toLowerCase()
    .split(/\\s+/)
    .filter((word) => word && !stop.has(word))
    .reduce((counts, word) => counts.set(word, (counts.get(word) ?? 0) + 1), new Map());
};`,
    `const tagsByUser = (events) => {
  const users = new Map();
  for (const { user, tag } of events) (users.get(user) ?? users.set(user, new Set()).get(user)).add(tag);
  return users;
};`,
    `const isIsomorphic = (a, b) => {
  if (a.length !== b.length) return false;
  const partner = new Map();
  const taken = new Set();
  return [...a].every((char, i) => {
    if (partner.has(char)) return partner.get(char) === b[i];
    if (taken.has(b[i])) return false;
    partner.set(char, b[i]);
    taken.add(b[i]);
    return true;
  });
};`,
    `const buildIndex = (docs) => {
  const index = new Map();
  for (const { id, text } of docs) {
    for (const word of countWords(text, []).keys()) (index.get(word) ?? index.set(word, new Set()).get(word)).add(id);
  }
  return index;
};`,
    `const search = (docs, query) => {
  const index = buildIndex(docs);
  const sets = [...countWords(query, []).keys()].map((word) => index.get(word) ?? new Set());
  if (sets.length === 0) return [];
  const [first, ...rest] = sets;
  return [...first].filter((id) => rest.every((set) => set.has(id)));
};`,
  ],
};

const OBJECTS: Boards = {
  reference: [
    `function countByCategory(list) {
  const counts = {};
  for (const record of list) {
    // The key is in a variable, so square brackets, not counts.category.
    counts[record.category] = (counts[record.category] ?? 0) + 1;
  }
  return counts;
}`,
    `function groupByCategory(list) {
  const groups = {};
  for (const record of list) {
    if (!groups[record.category]) groups[record.category] = [];
    groups[record.category].push(record.name);
  }
  return groups;
}`,
    `function summarize(list) {
  const out = {};
  const bestRating = {}; // category -> highest rating so far
  for (const record of list) {
    const key = record.category;
    if (!out[key]) {
      out[key] = { count: 0, runs: 0, best: record.name };
      bestRating[key] = record.rating;
    }
    out[key].count += 1;
    out[key].runs += record.runs;
    // Strictly higher, so the first record keeps a tie.
    if (record.rating > bestRating[key]) {
      out[key].best = record.name;
      bestRating[key] = record.rating;
    }
  }
  return out;
}`,
    `function sortActors(list) {
  // Copy first: sort changes the array it is called on.
  return [...list].sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name));
}`,
    `function topPerCategory(list, k) {
  const out = {};
  // Sorted once, so each category fills up with its best records first.
  for (const record of sortActors(list)) {
    if (!out[record.category]) out[record.category] = [];
    if (out[record.category].length < k) out[record.category].push(record.name);
  }
  return out;
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
}`,
    `function groupByCategory(list) {
  const groups = {};
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    if (groups[record.category] === undefined) {
      groups[record.category] = [];
    }
    groups[record.category].push(record.name);
  }
  return groups;
}`,
    `function summarize(list) {
  const out = {};
  const bestRating = {};
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const category = record.category;
    if (out[category] === undefined) {
      out[category] = { count: 0, runs: 0, best: record.name };
      bestRating[category] = record.rating;
    }
    const summary = out[category];
    summary.count = summary.count + 1;
    summary.runs = summary.runs + record.runs;
    if (record.rating > bestRating[category]) {
      summary.best = record.name;
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
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });
  return copy;
}`,
    `function topPerCategory(list, k) {
  const sorted = sortActors(list);
  const out = {};
  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];
    if (out[record.category] === undefined) {
      out[record.category] = [];
    }
    const names = out[record.category];
    if (names.length < k) {
      names.push(record.name);
    }
  }
  return out;
}`,
  ],
  senior: [
    `const countByCategory = (list) => {
  const counts = {};
  for (const { category } of list) counts[category] = (counts[category] ?? 0) + 1;
  return counts;
};`,
    `const groupByCategory = (list) => {
  const groups = {};
  for (const { name, category } of list) (groups[category] ??= []).push(name);
  return groups;
};`,
    `const summarize = (list) => {
  const out = {};
  const top = {};
  for (const { name, category, runs, rating } of list) {
    const summary = (out[category] ??= { count: 0, runs: 0, best: name });
    summary.count += 1;
    summary.runs += runs;
    if (!(category in top) || rating > top[category]) {
      top[category] = rating;
      summary.best = name;
    }
  }
  return out;
};`,
    `const byRunsThenName = (a, b) => b.runs - a.runs || a.name.localeCompare(b.name);
const sortActors = (list) => [...list].sort(byRunsThenName);`,
    `const topPerCategory = (list, k) => {
  const out = {};
  for (const { name, category } of sortActors(list)) {
    const names = (out[category] ??= []);
    if (names.length < k) names.push(name);
  }
  return out;
};`,
  ],
};

const LOOKUPS: Boards = {
  reference: [
    `function indexById(list) {
  const index = new Map();
  // One pass to build it; after that every lookup is a single get.
  for (const record of list) index.set(record.id, record);
  return index;
}`,
    `function diffCatalog(before, after) {
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
    // Each target once, in link order.
    if (!graph[from].includes(to)) graph[from].push(to);
  }
  return graph;
}`,
    `function crawlOrder(links, start) {
  const graph = linksToGraph(links);
  const order = [];
  const queue = [start];
  // Mark a page when it is queued, so no page is queued twice.
  const visited = new Set([start]);
  while (queue.length > 0) {
    const page = queue.shift();
    order.push(page);
    for (const next of graph[page] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}`,
    `function crawlDepths(links, start) {
  const graph = linksToGraph(links);
  // depths doubles as the visited set: a page with a depth has been queued.
  const depths = { [start]: 0 };
  const queue = [start];
  while (queue.length > 0) {
    const page = queue.shift();
    for (const next of graph[page] ?? []) {
      if (!(next in depths)) {
        depths[next] = depths[page] + 1;
        queue.push(next);
      }
    }
  }
  return depths;
}`,
  ],
  junior: [
    `function indexById(list) {
  const index = new Map();
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    index.set(record.id, record);
  }
  return index;
}`,
    `function diffCatalog(before, after) {
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
}`,
    `function crawlOrder(links, start) {
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
    `function crawlDepths(links, start) {
  const graph = linksToGraph(links);
  const depths = {};
  depths[start] = 0;
  const queue = [start];
  while (queue.length > 0) {
    const page = queue.shift();
    const neighbours = graph[page] || [];
    for (let i = 0; i < neighbours.length; i++) {
      const next = neighbours[i];
      if (depths[next] === undefined) {
        depths[next] = depths[page] + 1;
        queue.push(next);
      }
    }
  }
  return depths;
}`,
  ],
  senior: [
    `const indexById = (list) => new Map(list.map((record) => [record.id, record]));`,
    `const diffCatalog = (before, after) => {
  const old = indexById(before);
  const now = indexById(after);
  const ids = (list, keep) => list.filter(keep).map(({ id }) => id);
  return {
    added: ids(after, ({ id }) => !old.has(id)),
    removed: ids(before, ({ id }) => !now.has(id)),
    changed: ids(after, ({ id, runs }) => old.has(id) && old.get(id).runs !== runs),
  };
};`,
    `const linksToGraph = (links) => {
  const graph = {};
  for (const [from, to] of links) {
    const targets = (graph[from] ??= []);
    if (!targets.includes(to)) targets.push(to);
  }
  return graph;
};`,
    `const crawlOrder = (links, start) => {
  const graph = linksToGraph(links);
  const visited = new Set([start]);
  for (const page of visited) {
    for (const next of graph[page] ?? []) visited.add(next);
  }
  return [...visited];
};`,
    `const crawlDepths = (links, start) => {
  const graph = linksToGraph(links);
  const depths = new Map([[start, 0]]);
  for (const [page, depth] of depths) {
    for (const next of graph[page] ?? []) if (!depths.has(next)) depths.set(next, depth + 1);
  }
  return Object.fromEntries(depths);
};`,
  ],
};

const HIDDEN: Record<string, Hidden> = {
  'js-path-map': [
    [['[...countAll([0, 0, false])]', [[0, 2], [false, 1]]], ['countAll([true, true]).get(true)', 2]],
    [['mostCommon([3, 1, 1, 3, 2])', 3], ['mostCommon([0, 0, 1])', 0]],
    [['twoSum([0, 4, 0], 0)', [0, 2]], ['twoSum([1, 5, 9], 14)', [1, 2]], ['twoSum([2, 2, 2], 4)', [0, 1]]],
    [['topK([5, 4, 4, 5, 3], 3)', [5, 4, 3]], ['topK(["b", "a", "a"], 2)', ['a', 'b']]],
    [['groupAnagrams(["listen", "silent", "enlist", "google"])', [['listen', 'silent', 'enlist'], ['google']]], ['groupAnagrams(["", ""])', [['', '']]]],
  ],
  'js-path-set': [
    [['unique([true, false, true])', [true, false]], ['unique([NaN, NaN]).length', 1]],
    [['common(["a", "b"], ["b", "a"])', ['a', 'b']], ['common([1, 2, 2, 3], [2, 2])', [2]]],
    [['difference([0, "0", 0], ["0"])', [0]], ['difference(["x", "y", "x"], ["y"])', ['x']]],
    [['firstRepeat(["b", "a", "a", "b"])', 'a'], ['firstRepeat([false, true, false])', false]],
    [['duplicates(["a", "b", "b", "a", "c"])', ['b', 'a']], ['duplicates([0, false, 0, false])', [0, false]]],
  ],
  'js-path-mapset': [
    [['[...countWords("a\\tb\\na", [])]', [['a', 2], ['b', 1]]], ['countWords("Stop stop", ["stop"]).size', 0]],
    [['[...tagsByUser([{user: "b", tag: "1"}, {user: "a", tag: "2"}]).keys()]', ['b', 'a']], ['tagsByUser([{user: "a", tag: "x"}]).has("b")', false]],
    [['isIsomorphic("badc", "baba")', false], ['isIsomorphic("abab", "cdcd")', true]],
    [['buildIndex([{id: 1, text: "A b"}, {id: 2, text: "a"}]).get("a").size', 2], ['buildIndex([{id: 3, text: "x"}]).has("y")', false]],
    [['search([{id: 1, text: "a b"}, {id: 2, text: "b a"}], "b a b")', [1, 2]], ['search([{id: "x", text: "a"}], "A")', ['x']]],
  ],
  'js-path-objects': [
    [['countByCategory([{category: "b"}, {category: "a"}]).b', 1], ['Object.keys(countByCategory([{category: "z"}, {category: "a"}]))', ['z', 'a']]],
    [['groupByCategory([{name: "A", category: "x"}, {name: "A", category: "x"}])', { x: ['A', 'A'] }], ['Object.keys(groupByCategory([{name: "A", category: "b"}, {name: "B", category: "a"}]))', ['b', 'a']]],
    [['summarize([{name: "A", category: "x", runs: 1, rating: 1}, {name: "B", category: "x", runs: 1, rating: 2}, {name: "C", category: "x", runs: 1, rating: 2}]).x.best', 'B'], ['summarize([{name: "A", category: "x", runs: 2, rating: 1}, {name: "B", category: "y", runs: 3, rating: 1}]).y.runs', 3]],
    [['sortActors([{name: "b", runs: 0}, {name: "a", runs: 0}]).map((a) => a.name)', ['a', 'b']], ['sortActors([{name: "A", runs: 1}, {name: "B", runs: 2}, {name: "C", runs: 3}]).map((a) => a.runs)', [3, 2, 1]]],
    [['topPerCategory([{name: "A", category: "x", runs: 1}, {name: "B", category: "y", runs: 2}], 1)', { x: ['A'], y: ['B'] }], ['topPerCategory([{name: "A", category: "x", runs: 5}, {name: "B", category: "x", runs: 5}, {name: "C", category: "x", runs: 9}], 2).x', ['C', 'A']]],
  ],
  'js-path-lookups': [
    [['indexById([{id: "a", n: 1}]).get("a").n', 1], ['indexById([{id: 1}, {id: 2}]).get(2).id', 2]],
    [['diffCatalog([{id: "a", runs: 1}, {id: "b", runs: 1}], [{id: "b", runs: 1}, {id: "a", runs: 2}])', { added: [], removed: [], changed: ['a'] }]],
    [['linksToGraph([["a", "b"], ["a", "c"], ["a", "b"]]).a', ['b', 'c']], ['linksToGraph([["a", "a"]])', { a: ['a'] }]],
    [['crawlOrder([["a", "a"]], "a")', ['a']], ['crawlOrder([["s", "b"], ["s", "a"], ["a", "c"], ["b", "c"]], "s")', ['s', 'b', 'a', 'c']]],
    [['crawlDepths([["a", "a"]], "a")', { a: 0 }], ['crawlDepths([["s", "x"], ["x", "y"], ["y", "z"], ["s", "z"]], "s").z', 1]],
  ],
};

export const JAVASCRIPT_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...cumulativeLevels('js-path-map', MAP, HIDDEN['js-path-map']),
  ...cumulativeLevels('js-path-set', SET, HIDDEN['js-path-set']),
  ...cumulativeLevels('js-path-mapset', MAP_AND_SET, HIDDEN['js-path-mapset']),
  ...cumulativeLevels('js-path-objects', OBJECTS, HIDDEN['js-path-objects']),
  ...cumulativeLevels('js-path-lookups', LOOKUPS, HIDDEN['js-path-lookups']),
]);
