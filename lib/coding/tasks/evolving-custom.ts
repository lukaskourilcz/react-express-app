/** The Custom category: two short evolving paths for a foundations-first
 * algorithm interview. The first drills Map and Set on their own; the second
 * builds and categorises plain objects, then ends on a crawl-shaped BFS. Every
 * step adds one small function to the same file and keeps the earlier ones, so
 * the whole category is twenty steps of five to ten minutes each.
 *
 * English only: the Czech fields stay empty, which the content contract
 * accepts unless `CODING_REQUIRE_CS=1`.
 *
 * Task bodies only: prompts, starters, visible tests, hints and method steps.
 * Solutions live in `lib/coding/solutions/evolving-custom.ts`. */

import type { CallTest, Localized } from '../../../shared/coding-catalog';
import type { Spec } from './evolving';

export const CUSTOM_MAPSET_ID = 'js-custom-mapset';
export const CUSTOM_CATALOG_ID = 'js-custom-catalog';

const en = (value: string): Localized => ({ en: value, cs: '' });
const check = (call: string, expected: unknown, label?: string, edge = false): CallTest => ({
  call,
  expected,
  ...(label ? { label: en(label) } : {}),
  ...(edge ? { edge: true } : {}),
});
const mdn = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/';
const ref = (title: string, path: string) => ({ title: en(title), url: mdn + path });

const MAPSET_STARTER = `// Map and Set basics. Every step adds one function to this file.
// Keep the earlier functions: their checks run again at every step.

function unique(items) {
  // Return a new array.
}

// Scratch pad — change this and press Run.
console.log(unique(["a", "b", "a"]));
`;

const CATALOG_STARTER = `// Objects and grouping, on a small store catalogue. Every step adds one
// function to this file. Keep the earlier functions: their checks run again.

const actors = [
  { id: "a1", name: "Web Scraper", category: "scraping", runs: 900, rating: 4.5 },
  { id: "a2", name: "Maps Extractor", category: "maps", runs: 1200, rating: 4.8 },
  { id: "a3", name: "Link Checker", category: "seo", runs: 300, rating: 4.1 },
  { id: "a4", name: "Page Crawler", category: "scraping", runs: 1500, rating: 4.6 },
];

function countByCategory(list) {
  // Return a plain object: { category: count }.
}

// Scratch pad — change this and press Run.
console.log(countByCategory(actors));
`;

export const CUSTOM_EVOLVING: Record<string, Spec> = {
  [CUSTOM_MAPSET_ID]: {
    starter: MAPSET_STARTER,
    focus: ['map-set'],
    prompts: [
      en('Add `common(a, b)`: the values that appear in both arrays, in the order they appear in `a`, each value once. `common([1, 2, 3, 2], [2, 3, 4])` gives `[2, 3]`. Turn `b` into a Set first so each check is one `has()` call, not a loop over `b`. Target: O(n + m).'),
      en('Add `mostCommon(items)`: the value that appears most often. If two values tie, the one seen first wins. An empty array gives `null`. `mostCommon(["a", "b", "b"])` gives `"b"`. Build the counts with the `countAll` you just wrote, then walk the Map once.'),
      en('Add `twoSum(numbers, target)`: the indices `[i, j]` (i < j) of two values that add up to `target`, or `[]` if none do. `twoSum([2, 7, 11, 15], 9)` gives `[0, 1]`. Read the array once and keep a Map from each value to its index. At each value, look up `target - value` before you store the current one. Target: O(n).'),
      en('Add `topK(items, k)`: the `k` most frequent values, most frequent first. Equal counts keep the order the values first appeared. If `k` is larger than the number of distinct values, return all of them. `topK(["a", "b", "b", "c", "c", "c"], 2)` gives `["c", "b"]`. Reuse `countAll` and `countsToPairs`.'),
      en('Add `groupAnagrams(words)`: gather words made of the same letters. `groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])` gives `[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`. The key for a word is its letters sorted: `[...word].sort().join("")`. Groups come out in the order their first word appeared, and each group keeps input order. Empty input gives `[]`.'),
    ],
    hints: [
      en('`new Set(array)` removes duplicates for you, and `[...set]` turns it back into an array. For `common`, make `new Set(b)` once, then keep a second Set of values you have already added.'),
      en('Counting: `map.set(x, (map.get(x) ?? 0) + 1)`. To find the winner, loop with `for (const [value, count] of map)` and only replace the best when the count is strictly greater, so the first one wins a tie.'),
      en('A Set answers "have I seen this before?". A Map answers "have I seen this before, and where?". For twoSum, store `value -> index` after you check for the partner.'),
      en('`[...map.entries()]` gives `[key, value]` pairs. `sort((a, b) => b[1] - a[1])` orders them by count, highest first, and sort keeps equal counts in their original order. Then `slice(0, k)` and `map(([value]) => value)`.'),
      en('Grouping always has the same shape: work out the key, create an empty group if the key is new, push into it. `if (!groups.has(key)) groups.set(key, []); groups.get(key).push(word);`'),
    ],
    approaches: [
      [en('Make a Set from `b` once.'), en('Loop over `a`. Keep a value if the Set from `b` has it and you have not added it yet.'), en('Use a second Set to remember what you already added, and push kept values into a result array.')],
      [en('Call `countAll(items)` to get a Map of value -> count.'), en('Start with `best = null` and `bestCount = 0`.'), en('Loop over the Map entries and replace the best only when a count is strictly greater.')],
      [en('Create `const seen = new Map()`.'), en('For each index, work out `need = target - numbers[i]`.'), en('If `seen.has(need)`, return `[seen.get(need), i]`. Otherwise store the current value, if it is not already stored.')],
      [en('Count with `countAll`, then turn the Map into sorted pairs with `countsToPairs`.'), en('Take the first `k` pairs with `slice(0, k)`.'), en('Return only the values: `map(([value]) => value)`.')],
      [en('For each word, build the key: its letters sorted and joined.'), en('If the Map has no group for that key yet, set an empty array.'), en('Push the word into its group, then return `[...groups.values()]`.')],
    ],
    tests: [
      [
        check('common([1, 2, 3, 2], [2, 3, 4])', [2, 3]),
        check('common([5, 4, 3], [3, 4])', [4, 3], 'order follows the first array'),
        check('common([1, 1, 1], [1])', [1], 'each value once', true),
        check('common([], [1, 2])', [], 'empty first array', true),
        check('common(["x"], ["y"])', [], 'nothing in common', true),
      ],
      [
        check('mostCommon(["a", "b", "b"])', 'b'),
        check('mostCommon(["a", "b", "a", "b"])', 'a', 'a tie goes to the value seen first', true),
        check('mostCommon([7])', 7),
        check('mostCommon(["x", "y", "y", "x", "x"])', 'x'),
        check('mostCommon([])', null, 'empty input gives null', true),
      ],
      [
        check('twoSum([2, 7, 11, 15], 9)', [0, 1]),
        check('twoSum([3, 2, 4], 6)', [1, 2], 'a value is never paired with itself'),
        check('twoSum([3, 3], 6)', [0, 1], 'two equal values are a valid pair', true),
        check('twoSum([1, 2], 4)', [], 'no pair adds up', true),
        check('twoSum([], 5)', [], 'empty input', true),
        check('twoSum([-1, -2, -3, -4], -7)', [2, 3]),
      ],
      [
        check('topK(["a", "b", "b", "c", "c", "c"], 2)', ['c', 'b']),
        check('topK(["x", "y", "y", "x"], 1)', ['x'], 'a tie keeps first-seen order', true),
        check('topK(["a", "b"], 5)', ['a', 'b'], 'k larger than the distinct values', true),
        check('topK([1, 1, 2], 0)', [], 'k of zero', true),
        check('topK([], 3)', [], 'empty input', true),
      ],
      [
        check('groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])', [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]),
        check('groupAnagrams(["abc", "def"])', [['abc'], ['def']]),
        check('groupAnagrams(["ab", "ba", "ab"])', [['ab', 'ba', 'ab']], 'repeated words stay in their group'),
        check('groupAnagrams(["a"])', [['a']], 'one word, one group', true),
        check('groupAnagrams([])', [], 'empty input', true),
      ],
    ],
    references: [
      [ref('Set', 'Global_Objects/Set'), ref('Set.prototype.has()', 'Global_Objects/Set/has')],
      [ref('Map', 'Global_Objects/Map'), ref('Nullish coalescing (??)', 'Operators/Nullish_coalescing')],
      [ref('Map.prototype.get()', 'Global_Objects/Map/get'), ref('Map.prototype.has()', 'Global_Objects/Map/has')],
      [ref('Map.prototype.entries()', 'Global_Objects/Map/entries'), ref('Array.prototype.sort()', 'Global_Objects/Array/sort')],
      [ref('Map.prototype.values()', 'Global_Objects/Map/values'), ref('Array.prototype.join()', 'Global_Objects/Array/join')],
    ],
  },
  [CUSTOM_CATALOG_ID]: {
    starter: CATALOG_STARTER,
    focus: ['objects', 'map-set'],
    prompts: [
      en('Add `groupByCategory(list)`: a plain object that maps each category to the names in it, in input order. `[{name: "A", category: "x"}, {name: "B", category: "y"}, {name: "C", category: "x"}]` gives `{x: ["A", "C"], y: ["B"]}`. An empty list gives `{}`. The pattern is: if the key is new, create an empty array; then push.'),
      en('Add `summarize(list)`: for every category, an object `{count, runs, best}`. `count` is how many records it has, `runs` is the sum of their `runs`, and `best` is the name with the highest `rating` (the first one wins a tie). Create the inner object the first time you meet a category, then update it for every record.'),
      en('Add `topPerCategory(list, k)`: for every category, the names of its `k` records with the most runs, ordered like `sortActors` (more runs first, equal runs by name A–Z). Categories with fewer than `k` records keep all of them. Sort once with `sortActors`, then group. `k` is at least 1.'),
      en('Add `diffCatalog(before, after)`: compare two scrapes of the same catalogue by `id` and return `{added, removed, changed}`. `added` is ids only in `after` (in `after` order), `removed` is ids only in `before` (in `before` order), and `changed` is ids in both whose `runs` differ (in `after` order). Build `indexById(before)` and `indexById(after)` first, so every lookup is one `get` or `has`.'),
      en('Add `crawlOrder(links, start)`: the pages a crawler visits from `start`, breadth first. Visit `start`, then its links in link order, then theirs, and never visit a page twice. Pages not reachable from `start` do not appear. `crawlOrder([["home", "a"], ["home", "b"], ["a", "c"]], "home")` gives `["home", "a", "b", "c"]`. Use `linksToGraph`, a queue (array with `push` and `shift`) and a `visited` Set.'),
    ],
    hints: [
      en('Counting into an object: `counts[key] = (counts[key] ?? 0) + 1`. Grouping into an object: `(groups[key] ??= []).push(value)`. Use square brackets, because the key is in a variable: `obj[key]`, not `obj.key`.'),
      en('A number per category is `obj[key] = (obj[key] ?? 0) + value`. An object per category is the same idea: `if (!out[key]) out[key] = { count: 0, runs: 0, best: record.name }`, then update its fields. Keep the best rating per category in a second object, so the result carries only `count`, `runs` and `best`.'),
      en('`[...list].sort(...)` copies before sorting, so the caller\'s array is not changed. Compare by two keys with `b.runs - a.runs || a.name.localeCompare(b.name)`. After sorting, group and push only while a group has fewer than `k` names.'),
      en('`new Map(list.map((record) => [record.id, record]))` builds a lookup in one line. Then `added` is the `after` records whose id `before` does not have, and `changed` is the ones it has with a different `runs`.'),
      en('A graph is a grouping: for each `[from, to]`, create `graph[from]` if it is new, then push `to` unless it is already there. For BFS, add a page to `visited` when you put it in the queue, not when you take it out, so no page is queued twice.'),
    ],
    approaches: [
      [en('Start with `const groups = {}`.'), en('For each record, create `groups[record.category] = []` if it does not exist yet.'), en('Push `record.name` into that array and return `groups`.')],
      [en('Start with `const out = {}`.'), en('The first time a category appears, create `{ count: 0, runs: 0, best: record.name }` and remember that record\'s rating.'), en('For every record, add 1 to count, add its runs, and replace best only if its rating is strictly higher.')],
      [en('Sort a copy with `sortActors(list)`.'), en('Walk the sorted list and group names by category.'), en('Only push while the group has fewer than `k` names.')],
      [en('Build `indexById(before)` and `indexById(after)`.'), en('Walk `after`: a missing id is added, a present id with different runs is changed.'), en('Walk `before`: an id that `after` does not have is removed.')],
      [en('Build the graph with `linksToGraph(links)`.'), en('Start with `queue = [start]` and `visited = new Set([start])`.'), en('While the queue has pages, `shift()` one, push it to the order, and queue each neighbour you have not visited yet.')],
    ],
    tests: [
      [
        check('groupByCategory([{name: "A", category: "x"}, {name: "B", category: "y"}, {name: "C", category: "x"}])', { x: ['A', 'C'], y: ['B'] }),
        check('groupByCategory([{name: "Solo", category: "seo"}])', { seo: ['Solo'] }),
        check('Object.keys(groupByCategory([{name: "A", category: "z"}, {name: "B", category: "a"}]))', ['z', 'a'], 'categories appear in first-seen order'),
        check('groupByCategory([])', {}, 'empty list gives an empty object', true),
      ],
      [
        check('summarize([{name: "A", category: "x", runs: 10, rating: 4}, {name: "B", category: "x", runs: 5, rating: 5}, {name: "C", category: "y", runs: 1, rating: 3}])', { x: { count: 2, runs: 15, best: 'B' }, y: { count: 1, runs: 1, best: 'C' } }),
        check('summarize([{name: "A", category: "x", runs: 1, rating: 4}, {name: "B", category: "x", runs: 1, rating: 4}]).x.best', 'A', 'a rating tie goes to the first record', true),
        check('summarize([{name: "Z", category: "q", runs: 0, rating: 1}])', { q: { count: 1, runs: 0, best: 'Z' } }, 'zero runs still counts', true),
        check('summarize([])', {}, 'empty list gives an empty object', true),
      ],
      [
        check('topPerCategory([{name: "A", category: "x", runs: 1}, {name: "B", category: "x", runs: 9}, {name: "C", category: "x", runs: 5}, {name: "D", category: "y", runs: 2}], 2)', { x: ['B', 'C'], y: ['D'] }),
        check('topPerCategory([{name: "B", category: "x", runs: 3}, {name: "A", category: "x", runs: 3}], 1)', { x: ['A'] }, 'equal runs sort by name', true),
        check('topPerCategory([{name: "A", category: "x", runs: 1}], 5)', { x: ['A'] }, 'fewer records than k', true),
        check('topPerCategory([], 3)', {}, 'empty list', true),
      ],
      [
        check('diffCatalog([{id: "a", runs: 1}, {id: "b", runs: 2}], [{id: "b", runs: 3}, {id: "c", runs: 1}])', { added: ['c'], removed: ['a'], changed: ['b'] }),
        check('diffCatalog([{id: "a", runs: 1}], [{id: "a", runs: 1}])', { added: [], removed: [], changed: [] }, 'nothing changed', true),
        check('diffCatalog([], [{id: "x", runs: 0}, {id: "y", runs: 0}])', { added: ['x', 'y'], removed: [], changed: [] }, 'everything is new', true),
        check('diffCatalog([{id: "p", runs: 1}, {id: "q", runs: 1}], [])', { added: [], removed: ['p', 'q'], changed: [] }, 'everything is gone', true),
      ],
      [
        check('crawlOrder([["home", "a"], ["home", "b"], ["a", "c"]], "home")', ['home', 'a', 'b', 'c']),
        check('crawlOrder([["a", "b"], ["b", "a"], ["b", "c"]], "a")', ['a', 'b', 'c'], 'a cycle does not loop forever', true),
        check('crawlOrder([["x", "y"]], "home")', ['home'], 'a start with no links', true),
        check('crawlOrder([["a", "b"], ["c", "d"]], "a")', ['a', 'b'], 'unreachable pages do not appear'),
        check('crawlOrder([["a", "c"], ["a", "b"], ["b", "c"], ["c", "d"]], "a")', ['a', 'c', 'b', 'd'], 'breadth first, not depth first'),
      ],
    ],
    references: [
      [ref('Property accessors: obj[key]', 'Operators/Property_accessors'), ref('Nullish coalescing assignment (??=)', 'Operators/Nullish_coalescing_assignment')],
      [ref('Object', 'Global_Objects/Object'), ref('for...of', 'Statements/for...of')],
      [ref('Array.prototype.sort()', 'Global_Objects/Array/sort'), ref('String.prototype.localeCompare()', 'Global_Objects/String/localeCompare')],
      [ref('Map() constructor', 'Global_Objects/Map/Map'), ref('Map.prototype.get()', 'Global_Objects/Map/get')],
      [ref('Set.prototype.has()', 'Global_Objects/Set/has'), ref('Array.prototype.shift()', 'Global_Objects/Array/shift')],
    ],
  },
};

/** The checkpoint before each milestone: one smaller function that the
 * milestone then builds on. Each one fails on the untouched starter. */
export interface CustomCheckpoint { prompt: Localized; tests: CallTest[] }
export const CUSTOM_CHECKPOINTS: Record<string, CustomCheckpoint[]> = {
  [CUSTOM_MAPSET_ID]: [
    {
      prompt: en('Write `unique(items)`: a new array with every value once, in the order it first appeared. `unique(["a", "b", "a", "c", "b"])` gives `["a", "b", "c"]`. Do not change the input array. A Set does the work: `new Set(items)` drops duplicates and keeps insertion order.'),
      tests: [
        check('unique(["a", "b", "a", "c", "b"])', ['a', 'b', 'c']),
        check('unique([3, 3, 3])', [3]),
        check('unique([1, "1", 1])', [1, '1'], 'a Set compares with ===, so 1 and "1" differ', true),
        check('unique([])', [], 'empty input', true),
        check('(() => { const list = [1, 1]; unique(list); return list; })()', [1, 1], 'the input is not changed', true),
      ],
    },
    {
      prompt: en('Write `countAll(items)`: a Map from each value to how many times it appears, keys in first-seen order. `[...countAll(["a", "b", "a"])]` gives `[["a", 2], ["b", 1]]`. Use `map.get(value) ?? 0` for a value you have not counted yet.'),
      tests: [
        check('[...countAll(["a", "b", "a"])]', [['a', 2], ['b', 1]]),
        check('countAll(["x", "x", "x"]).get("x")', 3),
        check('countAll([1, "1"]).get(1)', 1, 'number 1 and text "1" are different keys', true),
        check('countAll(["a"]).has("b")', false),
        check('countAll([]).size', 0, 'empty input gives an empty Map', true),
      ],
    },
    {
      prompt: en('Write `firstRepeat(items)`: the first value you meet for the second time while reading left to right, or `null` if nothing repeats. `firstRepeat(["a", "b", "c", "b", "a"])` gives `"b"`. Keep a Set of values you have seen.'),
      tests: [
        check('firstRepeat(["a", "b", "c", "b", "a"])', 'b'),
        check('firstRepeat(["x", "y", "x", "y"])', 'x'),
        check('firstRepeat([0, 0])', 0, 'zero is a real value, not "nothing"', true),
        check('firstRepeat([1, 2, 3])', null, 'nothing repeats', true),
        check('firstRepeat([])', null, 'empty input', true),
      ],
    },
    {
      prompt: en('Write `countsToPairs(counts)`: take a Map of value -> count and return `[value, count]` pairs, highest count first. Equal counts keep the Map\'s order. `countsToPairs(new Map([["a", 1], ["b", 3]]))` gives `[["b", 3], ["a", 1]]`. `[...counts]` gives you the pairs; `sort` orders them.'),
      tests: [
        check('countsToPairs(new Map([["a", 1], ["b", 3], ["c", 1]]))', [['b', 3], ['a', 1], ['c', 1]], 'equal counts keep Map order'),
        check('countsToPairs(countAll(["x", "y", "y"]))', [['y', 2], ['x', 1]]),
        check('countsToPairs(new Map([["z", 2]]))', [['z', 2]]),
        check('countsToPairs(new Map())', [], 'an empty Map', true),
      ],
    },
    {
      prompt: en('Write `firstUnique(text)`: the first character that appears exactly once, or `null` if there is none. `firstUnique("swiss")` gives `"w"`. Count every character first with `countAll([...text])`, then read the text again and return the first character whose count is 1. Upper and lower case are different characters.'),
      tests: [
        check('firstUnique("swiss")', 'w'),
        check('firstUnique("abc")', 'a'),
        check('firstUnique("aAb")', 'a', 'case matters', true),
        check('firstUnique("aabb")', null, 'every character repeats', true),
        check('firstUnique("")', null, 'empty text', true),
      ],
    },
  ],
  [CUSTOM_CATALOG_ID]: [
    {
      prompt: en('Write `countByCategory(list)`: a plain object that maps each `category` to how many records have it. `[{category: "a"}, {category: "b"}, {category: "a"}]` gives `{a: 2, b: 1}`. The key lives in a variable, so use `counts[record.category]`, not `counts.category`.'),
      tests: [
        check('countByCategory([{category: "a"}, {category: "b"}, {category: "a"}])', { a: 2, b: 1 }),
        check('countByCategory([{category: "seo"}])', { seo: 1 }),
        check('countByCategory([{category: "x"}, {category: "x"}, {category: "x"}])', { x: 3 }),
        check('countByCategory([])', {}, 'empty list gives an empty object', true),
      ],
    },
    {
      prompt: en('Write `totalRuns(list)`: a plain object that maps each category to the sum of its records\' `runs`. `[{category: "a", runs: 5}, {category: "a", runs: 2}]` gives `{a: 7}`. It is `countByCategory` again, adding `runs` instead of 1.'),
      tests: [
        check('totalRuns([{category: "a", runs: 5}, {category: "b", runs: 1}, {category: "a", runs: 2}])', { a: 7, b: 1 }),
        check('totalRuns([{category: "z", runs: 0}])', { z: 0 }, 'zero runs still creates the key', true),
        check('totalRuns([{category: "q", runs: 4}])', { q: 4 }),
        check('totalRuns([])', {}, 'empty list', true),
      ],
    },
    {
      prompt: en('Write `sortActors(list)`: a new array sorted by `runs`, most first. Equal runs go by `name`, A to Z. Do not change the input: copy it with `[...list]` before you call `sort`.'),
      tests: [
        check('sortActors([{name: "A", runs: 1}, {name: "B", runs: 9}]).map((a) => a.name)', ['B', 'A']),
        check('sortActors([{name: "B", runs: 3}, {name: "A", runs: 3}, {name: "C", runs: 7}]).map((a) => a.name)', ['C', 'A', 'B'], 'equal runs sort by name'),
        check('(() => { const list = [{name: "B", runs: 1}, {name: "A", runs: 2}]; sortActors(list); return list[0].name; })()', 'B', 'the input is not changed', true),
        check('sortActors([])', [], 'empty list', true),
      ],
    },
    {
      prompt: en('Write `indexById(list)`: a Map from each record\'s `id` to the record itself. Ids are unique. `indexById([{id: "x", runs: 1}]).get("x")` gives `{id: "x", runs: 1}`. This turns "search the array" into one `get`.'),
      tests: [
        check('indexById([{id: "x", runs: 1}]).get("x")', { id: 'x', runs: 1 }),
        check('[...indexById([{id: "x"}, {id: "y"}]).keys()]', ['x', 'y']),
        check('indexById([{id: "x"}]).has("nope")', false),
        check('indexById([]).size', 0, 'empty list gives an empty Map', true),
      ],
    },
    {
      prompt: en('Write `linksToGraph(links)`: turn `[from, to]` pairs into a plain object that maps each page to the pages it links to, in link order, each target once. `[["home", "a"], ["home", "b"], ["home", "a"]]` gives `{home: ["a", "b"]}`. Pages with no outgoing links do not get a key.'),
      tests: [
        check('linksToGraph([["home", "a"], ["home", "b"], ["a", "c"]])', { home: ['a', 'b'], a: ['c'] }),
        check('linksToGraph([["home", "a"], ["home", "b"], ["home", "a"]])', { home: ['a', 'b'] }, 'each target once'),
        check('Object.keys(linksToGraph([["a", "b"]]))', ['a'], 'a page with no links gets no key', true),
        check('linksToGraph([])', {}, 'no links', true),
      ],
    },
  ],
};
