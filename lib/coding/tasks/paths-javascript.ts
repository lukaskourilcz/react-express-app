/** The JavaScript section's short paths. Five levels each; every level adds
 * one function to the same file and keeps the earlier ones, whose checks run
 * again at every level.
 *
 * Map basics, Set basics, then a path that uses both together; after those,
 * Objects and grouping and Lookups and crawling carry the same habits onto
 * records. Map basics, Set basics and the two record paths grew out of the
 * earlier ten-step foundations paths, split so no path runs past five levels.
 *
 * Task bodies only: prompts, starters, visible tests, hints, method steps and
 * references. Solutions live in `lib/coding/solutions/paths-javascript.ts`. */

import type { Spec } from './evolving';
import { check, doc, en, mdn } from './path-helpers';

const starter = (title: string, first: string, comment: string, scratch: string) => `// ${title}. Every level adds one function to this file.
// Keep the earlier functions: their checks run again at every level.

${first} {
  // ${comment}
}

// Scratch pad — change this and press Run.
console.log(${scratch});
`;

export const JAVASCRIPT_PATHS: Record<string, Spec> = {
  'js-path-map': {
    starter: starter('Map basics', 'function countAll(items)', 'Return a Map: value -> how many times it appears.', 'countAll(["a", "b", "a"])'),
    focus: ['map-set'],
    prompts: [
      en('Write `countAll(items)`: a Map from each value to how many times it appears, keys in first-seen order. `[...countAll(["a", "b", "a"])]` gives `[["a", 2], ["b", 1]]`. Keys are compared by value and type, so the number `1` and the text `"1"` are different keys. Use `counts.get(value) ?? 0` for a value you have not counted yet.'),
      en('Add `mostCommon(items)`: the value that appears most often. If two values tie, the one seen first wins. An empty array gives `null`. `mostCommon(["a", "b", "b"])` gives `"b"`. Build the counts with `countAll`, then walk the Map once.'),
      en('Add `twoSum(numbers, target)`: the indices `[i, j]` (i < j) of two values that add up to `target`, or `[]` if none do. `twoSum([2, 7, 11, 15], 9)` gives `[0, 1]`. Read the array once and keep a Map from each value to the first index it appeared at. At each value, look up `target - value` before you store the current one. If several pairs work, return the one whose second index comes first, paired with the earliest matching value: `twoSum([1, 1, 5], 6)` gives `[0, 2]`. Target: O(n).'),
      en('Add `topK(items, k)`: the `k` most frequent values, most frequent first. Equal counts keep the order the values first appeared. If `k` is larger than the number of distinct values, return all of them; a `k` of `0` gives `[]`. `topK(["a", "b", "b", "c", "c", "c"], 2)` gives `["c", "b"]`. Count with `countAll`, then sort the Map\'s `[value, count]` pairs.'),
      en('Add `groupAnagrams(words)`: gather words made of the same letters. `groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])` gives `[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`. The key for a word is its letters sorted: `[...word].sort().join("")`. Groups come out in the order their first word appeared, and each group keeps input order. Empty input gives `[]`.'),
    ],
    hints: [
      en('Counting in a Map: `counts.set(item, (counts.get(item) ?? 0) + 1)`. `?? 0` turns the `undefined` a new key gives you into a starting count of zero.'),
      en('Loop with `for (const [value, count] of countAll(items))` and only replace the best when the count is strictly greater, so the first value wins a tie.'),
      en('A Map answers "have I seen this before, and where?". Store `value -> index` after you check for the partner, and only when the value is not stored yet, so the earliest index stays.'),
      en('`[...map]` gives `[key, value]` pairs. `sort((a, b) => b[1] - a[1])` orders them by count, highest first, and sort keeps equal counts in their original order. Then `slice(0, k)` and `map(([value]) => value)`.'),
      en('Grouping always has the same shape: work out the key, create an empty group if the key is new, push into it. `if (!groups.has(key)) groups.set(key, []); groups.get(key).push(word);`'),
    ],
    approaches: [
      [en('Create `const counts = new Map()`.'), en('Loop over the items with `for...of`.'), en('Set each item\'s count to its old count plus one, then return the Map.')],
      [en('Call `countAll(items)` to get a Map of value -> count.'), en('Start with `best = null` and `bestCount = 0`.'), en('Walk the Map and replace the best only when a count is strictly greater.')],
      [en('Create `const seen = new Map()`.'), en('For each index, work out `need = target - numbers[i]`.'), en('If `seen.has(need)`, return `[seen.get(need), i]`. Otherwise store the current value if it is not stored yet.')],
      [en('Count with `countAll(items)`.'), en('Spread the Map into pairs and sort them by count, highest first.'), en('Take the first `k` pairs and return only their values.')],
      [en('For each word, build the key: its letters sorted and joined.'), en('If the Map has no group for that key yet, set an empty array.'), en('Push the word into its group, then return `[...groups.values()]`.')],
    ],
    tests: [
      [
        check('[...countAll(["a", "b", "a"])]', [['a', 2], ['b', 1]]),
        check('countAll(["x", "x", "x"]).get("x")', 3),
        check('countAll(["a", "b"]) instanceof Map', true, 'the result is a Map, not a plain object'),
        check('countAll([1, "1"]).get(1)', 1, 'number 1 and text "1" are different keys', true),
        check('countAll(["a"]).has("b")', false),
        check('countAll([]).size', 0, 'empty input gives an empty Map', true),
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
        check('twoSum([1, 1, 5], 6)', [0, 2], 'the earliest partner wins', true),
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
      [mdn('Map', 'Global_Objects/Map'), mdn('Nullish coalescing (??)', 'Operators/Nullish_coalescing')],
      [mdn('for...of', 'Statements/for...of'), mdn('Map.prototype.entries()', 'Global_Objects/Map/entries')],
      [mdn('Map.prototype.get()', 'Global_Objects/Map/get'), mdn('Map.prototype.has()', 'Global_Objects/Map/has')],
      [mdn('Spread syntax (...)', 'Operators/Spread_syntax'), mdn('Array.prototype.sort()', 'Global_Objects/Array/sort')],
      [mdn('Map.prototype.values()', 'Global_Objects/Map/values'), mdn('Array.prototype.join()', 'Global_Objects/Array/join')],
    ],
  },

  'js-path-set': {
    starter: starter('Set basics', 'function unique(items)', 'Return a new array with every value once.', 'unique(["a", "b", "a"])'),
    focus: ['map-set'],
    prompts: [
      en('Write `unique(items)`: a new array with every value once, in the order it first appeared. `unique(["a", "b", "a", "c", "b"])` gives `["a", "b", "c"]`. Do not change the input array. A Set does the work: `new Set(items)` drops duplicates and keeps insertion order.'),
      en('Add `common(a, b)`: the values that appear in both arrays, in the order they appear in `a`, each value once. `common([1, 2, 3, 2], [2, 3, 4])` gives `[2, 3]`. Turn `b` into a Set first so each check is one `has()` call, not a loop over `b`. Target: O(n + m).'),
      en('Add `difference(a, b)`: the values in `a` that do not appear in `b`, each value once, in the order they appear in `a`. `difference([1, 2, 3, 2, 4], [2])` gives `[1, 3, 4]`. It is `common` turned around: make a Set from `b`, keep what it does not have, and let `unique` drop the repeats. Target: O(n + m).'),
      en('Add `firstRepeat(items)`: the first value you meet for the second time while reading left to right, or `null` if nothing repeats. `firstRepeat(["a", "b", "c", "b", "a"])` gives `"b"`. Keep a Set of the values you have seen.'),
      en('Add `duplicates(items)`: every value that appears more than once, each listed once, in the order its second copy appears. `duplicates([1, 2, 1, 3, 2, 1])` gives `[1, 2]`. It is `firstRepeat` that keeps going: one Set remembers what you have seen, a second one remembers what you have already reported.'),
    ],
    hints: [
      en('`new Set(array)` removes duplicates for you, and `[...set]` turns it back into an array. The input stays as it was.'),
      en('Make `new Set(b)` once, then keep a second Set of the values you have already added, so a value repeated in `a` goes in once.'),
      en('`!inB.has(value)` is the whole test. Filter `a` with it, then pass the result to `unique`.'),
      en('A Set answers "have I seen this before?". Check with `has` before you `add`; the first `has` that says yes is your answer.'),
      en('Two Sets: `seen` and `reported`. A value that `seen` already has and `reported` does not is a new duplicate: push it and add it to `reported`.'),
    ],
    approaches: [
      [en('Create a Set from the items.'), en('Spread the Set back into a new array.'), en('Return it; the input array is untouched.')],
      [en('Make a Set from `b` once.'), en('Loop over `a`. Keep a value if the Set from `b` has it and you have not added it yet.'), en('Use a second Set to remember what you already added, and push kept values into a result array.')],
      [en('Make a Set from `b` once.'), en('Keep the values of `a` that the Set does not have.'), en('Pass the kept values through `unique` and return the result.')],
      [en('Start with `const seen = new Set()`.'), en('For each item, return it if `seen` has it already.'), en('Otherwise add it to `seen`. After the loop, return `null`.')],
      [en('Start with two Sets, `seen` and `reported`, and an empty result.'), en('For each item: if `seen` has it and `reported` does not, push it and add it to `reported`.'), en('Add every item to `seen`, then return the result.')],
    ],
    tests: [
      [
        check('unique(["a", "b", "a", "c", "b"])', ['a', 'b', 'c']),
        check('unique([3, 3, 3])', [3]),
        check('unique([1, "1", 1])', [1, '1'], '1 and "1" are different values', true),
        check('unique([])', [], 'empty input', true),
        check('(() => { const list = [1, 1]; unique(list); return list; })()', [1, 1], 'the input is not changed', true),
      ],
      [
        check('common([1, 2, 3, 2], [2, 3, 4])', [2, 3]),
        check('common([5, 4, 3], [3, 4])', [4, 3], 'order follows the first array'),
        check('common([1, 1, 1], [1])', [1], 'each value once', true),
        check('common([], [1, 2])', [], 'empty first array', true),
        check('common(["x"], ["y"])', [], 'nothing in common', true),
      ],
      [
        check('difference([1, 2, 3, 2, 4], [2])', [1, 3, 4]),
        check('difference(["a", "b"], [])', ['a', 'b'], 'nothing to remove'),
        check('difference([1, 1, 5], [9])', [1, 5], 'each value once', true),
        check('difference([1, 2], [1, 2, 3])', [], 'everything is removed', true),
        check('difference([], [1])', [], 'empty first array', true),
      ],
      [
        check('firstRepeat(["a", "b", "c", "b", "a"])', 'b'),
        check('firstRepeat(["x", "y", "x", "y"])', 'x'),
        check('firstRepeat([0, 0])', 0, 'zero is a real value, not "nothing"', true),
        check('firstRepeat([1, 2, 3])', null, 'nothing repeats', true),
        check('firstRepeat([])', null, 'empty input', true),
      ],
      [
        check('duplicates([1, 2, 1, 3, 2, 1])', [1, 2]),
        check('duplicates(["b", "a", "a", "b"])', ['a', 'b'], 'order of the second copy, not the first'),
        check('duplicates([7, 7, 7, 7])', [7], 'a value is reported once', true),
        check('duplicates([1, 2, 3])', [], 'nothing repeats', true),
        check('duplicates([])', [], 'empty input', true),
      ],
    ],
    references: [
      [mdn('Set', 'Global_Objects/Set'), mdn('Spread syntax (...)', 'Operators/Spread_syntax')],
      [mdn('Set.prototype.has()', 'Global_Objects/Set/has'), mdn('Set.prototype.add()', 'Global_Objects/Set/add')],
      [mdn('Array.prototype.filter()', 'Global_Objects/Array/filter'), mdn('Set.prototype.has()', 'Global_Objects/Set/has')],
      [mdn('Set', 'Global_Objects/Set'), mdn('for...of', 'Statements/for...of')],
      [mdn('Set.prototype.add()', 'Global_Objects/Set/add'), doc('Equality comparisons and sameness', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness')],
    ],
  },

  'js-path-mapset': {
    starter: starter('Map and Set together', 'function countWords(text, stopWords)', 'Return a Map: word -> count, without the stop words.', 'countWords("The cat and the hat", ["the", "and"])'),
    focus: ['map-set', 'strings'],
    prompts: [
      en('Write `countWords(text, stopWords)`: a Map from each word to how many times it appears, in first-seen order. Lower-case the text, split it with `text.toLowerCase().split(/\\s+/)`, skip empty strings, and skip every word listed in `stopWords` (an array of lower-case words). Put `stopWords` in a Set first, so each skip is one `has()` call. `[...countWords("The cat and the hat", ["the", "and"])]` gives `[["cat", 1], ["hat", 1]]`.'),
      en('Add `tagsByUser(events)`: each event is `{ user, tag }`. Return a Map from each user to a Set of that user\'s tags, users and tags both in first-seen order. A tag the user already has is not added twice; the Set sees to that. `tagsByUser([{ user: "ana", tag: "js" }, { user: "ana", tag: "js" }]).get("ana")` is a Set holding `"js"` once.'),
      en('Add `isIsomorphic(a, b)`: `true` when you can turn `a` into `b` by replacing characters consistently. Every copy of one character becomes the same new character, and no two different characters become the same one. `isIsomorphic("egg", "add")` is `true`, `isIsomorphic("foo", "bar")` is `false`, and `isIsomorphic("ab", "aa")` is `false`. Keep a Map from each character of `a` to its partner in `b`, and a Set of the partners already taken. Strings of different lengths are never isomorphic.'),
      en('Add `buildIndex(docs)`: each doc is `{ id, text }`. Return a Map from every word to the Set of ids of the docs that contain it: a search engine\'s inverted index. Split words the way `countWords` does; `countWords(doc.text, [])` gives you a doc\'s words as its keys. Words appear in first-seen order, and each Set lists ids in doc order.'),
      en('Add `search(docs, query)`: the ids of the docs that contain every word of `query`, in doc order. Words are case-insensitive, and a query with no words gives `[]`. Build the index with `buildIndex(docs)`, start from the Set of the first query word, and keep only the ids that every other word\'s Set also has. A word the index does not have means no doc matches.'),
    ],
    hints: [
      en('Make `const stop = new Set(stopWords)` before the loop. Then the loop is: skip `""`, skip `stop.has(word)`, count the rest with `counts.set(word, (counts.get(word) ?? 0) + 1)`.'),
      en('A Map whose values are Sets: `if (!map.has(user)) map.set(user, new Set()); map.get(user).add(tag);`. `add` ignores a tag the Set already holds.'),
      en('Walk both strings by index. If the Map knows `a[i]`, its partner must be `b[i]`. If it does not, `b[i]` must not be taken yet: then record the pair and mark `b[i]` as taken.'),
      en('The same Map-of-Sets shape as `tagsByUser`, keyed by word. `for (const word of countWords(doc.text, []).keys())` visits each word of a doc once, so an id goes into a word\'s Set once.'),
      en('`[...first].filter((id) => rest.every((set) => set.has(id)))` intersects Sets. Spreading the first Set keeps doc order, because each Set holds ids in doc order.'),
    ],
    approaches: [
      [en('Make a Set from `stopWords` and an empty Map for the counts.'), en('Lower-case the text and split it on whitespace.'), en('Skip empty strings and stop words; count everything else, then return the Map.')],
      [en('Start with `const users = new Map()`.'), en('For each event, create a new Set for a user you have not seen.'), en('Add the tag to that user\'s Set, then return the Map.')],
      [en('Return `false` straight away when the lengths differ.'), en('Keep `partner = new Map()` and `taken = new Set()`, and walk the strings by index.'), en('A known character must map to the same partner; a new one needs a partner nobody has taken. Any clash returns `false`.')],
      [en('Start with `const index = new Map()`.'), en('For each doc, take its distinct words from `countWords(doc.text, [])`.'), en('Add the doc\'s id to each word\'s Set, creating the Set the first time you see the word.')],
      [en('Split the query the way `countWords` does; no words gives `[]`.'), en('Build the index and look up each query word\'s Set. A missing word gives `[]`.'), en('Keep the ids of the first Set that every other Set also has, and return them.')],
    ],
    tests: [
      [
        check('[...countWords("The cat and the hat", ["the", "and"])]', [['cat', 1], ['hat', 1]]),
        check('[...countWords("go go GO stop", [])]', [['go', 3], ['stop', 1]], 'case does not matter'),
        check('countWords("a b", []) instanceof Map', true, 'the result is a Map'),
        check('countWords("  a   b  ", []).size', 2, 'extra spaces make no words', true),
        check('countWords("the the", ["the"]).size', 0, 'only stop words', true),
        check('countWords("", ["a"]).size', 0, 'empty text', true),
      ],
      [
        check('[...tagsByUser([{user: "ana", tag: "js"}, {user: "bo", tag: "css"}, {user: "ana", tag: "ts"}, {user: "ana", tag: "js"}])].map(([user, tags]) => [user, [...tags]])', [['ana', ['js', 'ts']], ['bo', ['css']]]),
        check('tagsByUser([{user: "ana", tag: "js"}]).get("ana") instanceof Set', true, 'each user maps to a Set'),
        check('tagsByUser([{user: "a", tag: "x"}, {user: "a", tag: "x"}]).get("a").size', 1, 'a repeated tag counts once', true),
        check('tagsByUser([]).size', 0, 'no events', true),
      ],
      [
        check('isIsomorphic("egg", "add")', true),
        check('isIsomorphic("foo", "bar")', false),
        check('isIsomorphic("paper", "title")', true),
        check('isIsomorphic("ab", "aa")', false, 'two characters cannot share a partner', true),
        check('isIsomorphic("ab", "abc")', false, 'different lengths', true),
        check('isIsomorphic("", "")', true, 'two empty strings', true),
      ],
      [
        check('[...buildIndex([{id: 1, text: "red fish"}, {id: 2, text: "blue fish"}])].map(([word, ids]) => [word, [...ids]])', [['red', [1]], ['fish', [1, 2]], ['blue', [2]]]),
        check('[...buildIndex([{id: "a", text: "Go go"}]).get("go")]', ['a'], 'one id per doc, however often the word appears', true),
        check('buildIndex([{id: 1, text: "   "}]).size', 0, 'a doc with no words', true),
        check('buildIndex([]).size', 0, 'no docs', true),
      ],
      [
        check('search([{id: 1, text: "red fish"}, {id: 2, text: "blue fish"}, {id: 3, text: "red boat"}], "fish")', [1, 2]),
        check('search([{id: 1, text: "red fish"}, {id: 2, text: "blue fish"}, {id: 3, text: "red boat"}], "RED fish")', [1], 'every word must match, in any case'),
        check('search([{id: 1, text: "red fish"}], "green")', [], 'a word nobody has matches nothing', true),
        check('search([{id: 1, text: "red fish"}], "red green")', [], 'one unknown word is enough to match nothing', true),
        check('search([{id: 1, text: "red fish"}], "   ")', [], 'a query with no words', true),
        check('search([], "fish")', [], 'no docs', true),
      ],
    ],
    references: [
      [mdn('String.prototype.split()', 'Global_Objects/String/split'), mdn('Set.prototype.has()', 'Global_Objects/Set/has')],
      [mdn('Map', 'Global_Objects/Map'), mdn('Set.prototype.add()', 'Global_Objects/Set/add')],
      [mdn('Map.prototype.get()', 'Global_Objects/Map/get'), mdn('Set', 'Global_Objects/Set')],
      [mdn('Map.prototype.keys()', 'Global_Objects/Map/keys'), mdn('Set.prototype.add()', 'Global_Objects/Set/add')],
      [mdn('Array.prototype.every()', 'Global_Objects/Array/every'), mdn('Array.prototype.filter()', 'Global_Objects/Array/filter')],
    ],
  },

  'js-path-objects': {
    starter: `// Objects and grouping, on a small store catalogue. Every level adds one
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
`,
    focus: ['objects', 'map-set'],
    prompts: [
      en('Write `countByCategory(list)`: a plain object that maps each `category` to how many records have it. `[{category: "a"}, {category: "b"}, {category: "a"}]` gives `{a: 2, b: 1}`. The key lives in a variable, so use `counts[record.category]`, not `counts.category`.'),
      en('Add `groupByCategory(list)`: a plain object that maps each category to the names in it, in input order. `[{name: "A", category: "x"}, {name: "B", category: "y"}, {name: "C", category: "x"}]` gives `{x: ["A", "C"], y: ["B"]}`. An empty list gives `{}`. The pattern: if the key is new, create an empty array; then push.'),
      en('Add `summarize(list)`: for every category, an object `{count, runs, best}`. `count` is how many records it has, `runs` is the sum of their `runs`, and `best` is the name with the highest `rating` (the first one wins a tie). Create the inner object the first time you meet a category, then update it for every record.'),
      en('Add `sortActors(list)`: a new array sorted by `runs`, most first. Equal runs go by `name`, A to Z. Do not change the input: copy it with `[...list]` before you call `sort`.'),
      en('Add `topPerCategory(list, k)`: for every category, the names of its `k` records with the most runs, ordered like `sortActors` (more runs first, equal runs by name A to Z). Categories with fewer than `k` records keep all of them. Sort once with `sortActors`, then group. `k` is at least 1.'),
    ],
    hints: [
      en('Counting into an object: `counts[key] = (counts[key] ?? 0) + 1`. Square brackets, because the key is in a variable: `obj[key]`, not `obj.key`.'),
      en('Grouping into an object: `(groups[key] ??= []).push(value)`. `??=` creates the array only when the key has none yet.'),
      en('An object per category: `if (!out[key]) out[key] = { count: 0, runs: 0, best: record.name }`, then update its fields. Keep the best rating per category in a second object, so the result carries only `count`, `runs` and `best`.'),
      en('`[...list].sort(...)` copies before sorting, so the caller\'s array is not changed. Compare by two keys with `b.runs - a.runs || a.name.localeCompare(b.name)`.'),
      en('After sorting, group by category and push a name only while its group has fewer than `k` names.'),
    ],
    approaches: [
      [en('Start with `const counts = {}`.'), en('For each record, read `record.category` into a variable.'), en('Add 1 to that key, starting from 0 when the key is new, and return the object.')],
      [en('Start with `const groups = {}`.'), en('For each record, create `groups[record.category] = []` if it does not exist yet.'), en('Push `record.name` into that array and return `groups`.')],
      [en('Start with `const out = {}`.'), en('The first time a category appears, create `{ count: 0, runs: 0, best: record.name }` and remember that record\'s rating.'), en('For every record, add 1 to count, add its runs, and replace best only if its rating is strictly higher.')],
      [en('Copy the list with `[...list]`.'), en('Sort the copy: more runs first.'), en('When the runs are equal, compare the names with `localeCompare`.')],
      [en('Sort a copy with `sortActors(list)`.'), en('Walk the sorted list and group names by category.'), en('Only push while the group has fewer than `k` names.')],
    ],
    tests: [
      [
        check('countByCategory([{category: "a"}, {category: "b"}, {category: "a"}])', { a: 2, b: 1 }),
        check('countByCategory([{category: "seo"}])', { seo: 1 }),
        check('countByCategory([{category: "x"}, {category: "x"}, {category: "x"}])', { x: 3 }),
        check('countByCategory([])', {}, 'empty list gives an empty object', true),
      ],
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
        check('sortActors([{name: "A", runs: 1}, {name: "B", runs: 9}]).map((a) => a.name)', ['B', 'A']),
        check('sortActors([{name: "B", runs: 3}, {name: "A", runs: 3}, {name: "C", runs: 7}]).map((a) => a.name)', ['C', 'A', 'B'], 'equal runs sort by name'),
        check('(() => { const list = [{name: "B", runs: 1}, {name: "A", runs: 2}]; sortActors(list); return list[0].name; })()', 'B', 'the input is not changed', true),
        check('sortActors([])', [], 'empty list', true),
      ],
      [
        check('topPerCategory([{name: "A", category: "x", runs: 1}, {name: "B", category: "x", runs: 9}, {name: "C", category: "x", runs: 5}, {name: "D", category: "y", runs: 2}], 2)', { x: ['B', 'C'], y: ['D'] }),
        check('topPerCategory([{name: "B", category: "x", runs: 3}, {name: "A", category: "x", runs: 3}], 1)', { x: ['A'] }, 'equal runs sort by name', true),
        check('topPerCategory([{name: "A", category: "x", runs: 1}], 5)', { x: ['A'] }, 'fewer records than k', true),
        check('topPerCategory([], 3)', {}, 'empty list', true),
      ],
    ],
    references: [
      [mdn('Property accessors: obj[key]', 'Operators/Property_accessors'), mdn('Nullish coalescing (??)', 'Operators/Nullish_coalescing')],
      [mdn('Nullish coalescing assignment (??=)', 'Operators/Nullish_coalescing_assignment'), mdn('Object.keys()', 'Global_Objects/Object/keys')],
      [mdn('Object', 'Global_Objects/Object'), mdn('for...of', 'Statements/for...of')],
      [mdn('Array.prototype.sort()', 'Global_Objects/Array/sort'), mdn('String.prototype.localeCompare()', 'Global_Objects/String/localeCompare')],
      [mdn('Array.prototype.sort()', 'Global_Objects/Array/sort'), mdn('Array.prototype.push()', 'Global_Objects/Array/push')],
    ],
  },

  'js-path-lookups': {
    starter: starter('Lookups and crawling', 'function indexById(list)', 'Return a Map: id -> record.', 'indexById([{ id: "a1", runs: 900 }, { id: "a2", runs: 1200 }])'),
    focus: ['map-set', 'objects'],
    prompts: [
      en('Write `indexById(list)`: a Map from each record\'s `id` to the record itself. Ids are unique. `indexById([{id: "x", runs: 1}]).get("x")` gives `{id: "x", runs: 1}`. This turns "search the array" into one `get`.'),
      en('Add `diffCatalog(before, after)`: compare two scrapes of the same catalogue by `id` and return `{added, removed, changed}`. `added` is ids only in `after` (in `after` order), `removed` is ids only in `before` (in `before` order), and `changed` is ids in both whose `runs` differ (in `after` order). Build `indexById(before)` and `indexById(after)` first, so every lookup is one `get` or `has`.'),
      en('Add `linksToGraph(links)`: turn `[from, to]` pairs into a plain object that maps each page to the pages it links to, in link order, each target once. `[["home", "a"], ["home", "b"], ["home", "a"]]` gives `{home: ["a", "b"]}`. Pages with no outgoing links do not get a key.'),
      en('Add `crawlOrder(links, start)`: the pages a crawler visits from `start`, breadth first. Visit `start`, then its links in link order, then theirs, and never visit a page twice. Pages not reachable from `start` do not appear. `crawlOrder([["home", "a"], ["home", "b"], ["a", "c"]], "home")` gives `["home", "a", "b", "c"]`. Use `linksToGraph`, a queue (an array with `push` and `shift`) and a `visited` Set.'),
      en('Add `crawlDepths(links, start)`: how many clicks each reachable page is from `start`, as a plain object in visit order. `crawlDepths([["home", "a"], ["home", "b"], ["a", "c"]], "home")` gives `{home: 0, a: 1, b: 1, c: 2}`. It is `crawlOrder` again: a page\'s depth is one more than the depth of the page that queued it, and breadth first means the first depth you record is the smallest.'),
    ],
    hints: [
      en('`new Map(list.map((record) => [record.id, record]))` builds the lookup in one line. The values are the records themselves, not copies.'),
      en('With both indexes built, `added` is the `after` records whose id `before` does not have, and `changed` is the ones it has with a different `runs`.'),
      en('A graph is a grouping: for each `[from, to]`, create `graph[from]` if it is new, then push `to` unless it is already there.'),
      en('Add a page to `visited` when you put it in the queue, not when you take it out, so no page is queued twice. `graph[page] ?? []` covers pages with no links.'),
      en('Keep the depths in the object you return. Set `depths[start] = 0`; when you queue a neighbour that has no depth yet, give it `depths[page] + 1`. The object doubles as the visited set.'),
    ],
    approaches: [
      [en('Create `const index = new Map()`.'), en('For each record, `index.set(record.id, record)`.'), en('Return the Map.')],
      [en('Build `indexById(before)` and `indexById(after)`.'), en('Walk `after`: a missing id is added, a present id with different runs is changed.'), en('Walk `before`: an id that `after` does not have is removed.')],
      [en('Start with `const graph = {}`.'), en('For each `[from, to]`, create `graph[from] = []` if it is new.'), en('Push `to` unless the array already includes it, then return the graph.')],
      [en('Build the graph with `linksToGraph(links)`.'), en('Start with `queue = [start]` and `visited = new Set([start])`.'), en('While the queue has pages, `shift()` one, push it to the order, and queue each neighbour you have not visited yet.')],
      [en('Build the graph and start with `depths = { [start]: 0 }` and `queue = [start]`.'), en('Shift a page; for each neighbour without a depth, record `depths[page] + 1` and queue it.'), en('When the queue is empty, return `depths`.')],
    ],
    tests: [
      [
        check('indexById([{id: "x", runs: 1}]).get("x")', { id: 'x', runs: 1 }),
        check('[...indexById([{id: "x"}, {id: "y"}]).keys()]', ['x', 'y']),
        check('indexById([{id: "x"}]).has("nope")', false),
        check('indexById([]).size', 0, 'empty list gives an empty Map', true),
      ],
      [
        check('diffCatalog([{id: "a", runs: 1}, {id: "b", runs: 2}], [{id: "b", runs: 3}, {id: "c", runs: 1}])', { added: ['c'], removed: ['a'], changed: ['b'] }),
        check('diffCatalog([{id: "a", runs: 1}], [{id: "a", runs: 1}])', { added: [], removed: [], changed: [] }, 'nothing changed', true),
        check('diffCatalog([], [{id: "x", runs: 0}, {id: "y", runs: 0}])', { added: ['x', 'y'], removed: [], changed: [] }, 'everything is new', true),
        check('diffCatalog([{id: "p", runs: 1}, {id: "q", runs: 1}], [])', { added: [], removed: ['p', 'q'], changed: [] }, 'everything is gone', true),
      ],
      [
        check('linksToGraph([["home", "a"], ["home", "b"], ["a", "c"]])', { home: ['a', 'b'], a: ['c'] }),
        check('linksToGraph([["home", "a"], ["home", "b"], ["home", "a"]])', { home: ['a', 'b'] }, 'each target once'),
        check('Object.keys(linksToGraph([["a", "b"]]))', ['a'], 'a page with no links gets no key', true),
        check('linksToGraph([])', {}, 'no links', true),
      ],
      [
        check('crawlOrder([["home", "a"], ["home", "b"], ["a", "c"]], "home")', ['home', 'a', 'b', 'c']),
        check('crawlOrder([["a", "b"], ["b", "a"], ["b", "c"]], "a")', ['a', 'b', 'c'], 'a cycle does not loop forever', true),
        check('crawlOrder([["x", "y"]], "home")', ['home'], 'a start with no links', true),
        check('crawlOrder([["a", "b"], ["c", "d"]], "a")', ['a', 'b'], 'unreachable pages do not appear'),
        check('crawlOrder([["a", "c"], ["a", "b"], ["b", "c"], ["c", "d"]], "a")', ['a', 'c', 'b', 'd'], 'breadth first, not depth first'),
      ],
      [
        check('crawlDepths([["home", "a"], ["home", "b"], ["a", "c"]], "home")', { home: 0, a: 1, b: 1, c: 2 }),
        check('crawlDepths([["a", "b"], ["b", "c"], ["a", "c"]], "a")', { a: 0, b: 1, c: 1 }, 'the shortest route decides the depth'),
        check('Object.keys(crawlDepths([["a", "c"], ["a", "b"], ["c", "d"]], "a"))', ['a', 'c', 'b', 'd'], 'pages come in visit order'),
        check('crawlDepths([["x", "y"]], "home")', { home: 0 }, 'a start with no links', true),
        check('crawlDepths([["a", "b"], ["b", "a"]], "a")', { a: 0, b: 1 }, 'a cycle does not loop forever', true),
      ],
    ],
    references: [
      [mdn('Map() constructor', 'Global_Objects/Map/Map'), mdn('Map.prototype.get()', 'Global_Objects/Map/get')],
      [mdn('Map.prototype.has()', 'Global_Objects/Map/has'), mdn('Object initializer', 'Operators/Object_initializer')],
      [mdn('Nullish coalescing assignment (??=)', 'Operators/Nullish_coalescing_assignment'), mdn('Array.prototype.includes()', 'Global_Objects/Array/includes')],
      [mdn('Set.prototype.has()', 'Global_Objects/Set/has'), mdn('Array.prototype.shift()', 'Global_Objects/Array/shift')],
      [mdn('Array.prototype.shift()', 'Global_Objects/Array/shift'), mdn('in operator', 'Operators/in')],
    ],
  },
};
