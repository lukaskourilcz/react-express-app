/** D03 — Hash maps and sets.
 *
 * What a hash table actually trades: memory and an assumption about the hash
 * for expected constant get, set and has. Two lessons, four objective checks,
 * three coding exercises.
 *
 * The lessons say plainly what the expectation excludes. A JavaScript Map is
 * an implementation abstraction, and the specification asks only for access
 * times that are sublinear on average, so this module never promises a
 * worst-case constant lookup. */

import type { ModuleSource } from '../../types';

export const DSA_D03: ModuleSource = {
  id: 'dsa-v1-d03',
  title: 'Hash maps and sets',
  outcomes: [
    'Replace a nested scan with a Map or a Set and give the growth class of both versions, naming both inputs.',
    'Say what "expected constant" assumes and what an adversarial run of collisions does to it.',
    'Choose between a Map, a Set and an array from the access pattern rather than from habit.',
  ],
  competencies: ['maps-sets', 'complexity'],
  dependsOn: ['dsa-v1-d02'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'dsa-v1-d03-l1',
      title: 'What a hash map buys',
      summary: 'Hashing a key straight to its slot, the memory that pays for it, and how a Map differs from a plain object.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MDN — Map',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
          reviewedOn: '2026-09-08',
        },
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Finding a value in an array means looking at elements until one matches. Nothing else is available: position tells you nothing about content, so a miss costs a full traversal. A hash table changes the question from "where is it?" to "where would it have to be?" — it computes a slot from the key itself and looks only there.',
        },
        {
          kind: 'prose',
          body:
            'That computation is the hash function. It turns a key into a bucket index, deterministically: the same key always lands in the same bucket. Store the entry there, and a later lookup hashes the key again, goes straight to that bucket, and compares only what it finds. The number of entries in the table never entered the calculation, which is why the cost does not grow with it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// One traversal per lookup: a thousand lookups over a thousand users\n// is a million comparisons.\nconst findUser = (users, id) => users.find(user => user.id === id);\n\n// One traversal to build, then expected constant work per lookup.\nconst byId = new Map(users.map(user => [user.id, user]));\nconst findFast = id => byId.get(id);',
          caption: 'The trade: one linear pass and extra memory up front, then lookups that ignore the size of the collection.',
        },
        {
          kind: 'prose',
          body:
            'A hash function has to do two jobs. It has to be deterministic, or a stored entry becomes unfindable. And it has to spread keys across the buckets, because two keys that land in the same bucket have to be told apart by comparison, and comparisons are the part that grows.',
        },
        {
          kind: 'trace',
          caption: 'Four keys hashed into eight buckets, including one collision.',
          trace: {
            shape: 'array',
            legend: ['0', '1', '2', '3', '4', '5', '6', '7'],
            frames: [
              {
                cells: ['·', '·', '·', '·', '·', '·', '·', '·'],
                note: 'Eight empty buckets. The table has room for more entries than it holds, and that slack is deliberate.',
              },
              {
                cells: ['·', '·', '·', 'ana', '·', '·', '·', '·'],
                marks: [{ index: 3, role: 'active' }],
                note: 'The hash of "ana" is 3, so "ana" is written into bucket 3. No other bucket was touched.',
              },
              {
                cells: ['·', '·', '·', 'ana', '·', '·', 'bo', '·'],
                marks: [{ index: 6, role: 'active' }],
                note: 'The hash of "bo" is 6. Storing it costs the same as storing "ana" did, even though the table is no longer empty.',
              },
              {
                cells: ['·', '·', '·', 'ana, cyril', '·', '·', 'bo', '·'],
                marks: [{ index: 3, role: 'compare' }],
                note: '"cyril" hashes to 3 as well. Bucket 3 now holds two entries, so anything landing there has to compare keys.',
              },
              {
                cells: ['·', '·', '·', 'ana, cyril', '·', '·', 'bo', '·'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 6, role: 'excluded' },
                ],
                note: 'Looking up "cyril" hashes once to bucket 3 and compares the two keys there. Bucket 6 and the five empty buckets were never read.',
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Memory is what pays for the speed. A hash table keeps more buckets than entries so collisions stay rare, and it grows and rehashes when the entries catch up with the buckets. A Map of n entries therefore occupies more than n slots. On a few thousand items you will not notice; on tens of millions the slack is the constraint.',
        },
        {
          kind: 'prose',
          body:
            'JavaScript gives you two keyed containers, and they are not interchangeable. A plain object was a keyed store before `Map` existed, and it still works for string-keyed records. `Map` was added for the cases the object handles badly.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const counts = new Map();\ncounts.set('ana', 1);\ncounts.set('ana', counts.get('ana') + 1); // 2 — set replaces, get reads the old value back\ncounts.has('bo');                          // false\ncounts.size;                               // 1\n\nconst key = { id: 7 };\ncounts.set(key, 'stored under this exact object');\ncounts.get(key);                           // 'stored under this exact object'\ncounts.get({ id: 7 });                     // undefined — a different object",
          caption: 'set, get, has and size, and the identity rule that governs object keys.',
        },
        {
          kind: 'table',
          caption: 'Where a Map and a plain object actually differ.',
          headers: ['Question', 'Map', 'Plain object'],
          rows: [
            [
              'Which keys are allowed?',
              'Any value: strings, numbers, booleans, objects, functions, NaN',
              'Strings and symbols; every other key is converted to a string first',
            ],
            [
              'What order do entries come out in?',
              'Insertion order, for every key',
              'Integer-like keys first in ascending order, then the rest in insertion order',
            ],
            ['How many entries are there?', '`map.size`, read directly', '`Object.keys(obj).length`, which builds an array first'],
            [
              'Can a key arrive that you never set?',
              'No — a Map holds only what you put in it',
              '`toString` and other prototype names answer `in` unless you build with `Object.create(null)`',
            ],
            ['How do you iterate it?', '`for…of` over the Map, or over `keys`, `values`, `entries`', '`Object.entries(obj)`, which allocates an array of pairs'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Key equality in a Map follows SameValueZero. Two keys match when they are the same value, with two adjustments to `===`: `NaN` matches `NaN`, and `0` matches `-0`. So `1` and `"1"` are two separate keys, `true` and `1` are two separate keys, and a Map can count occurrences of `NaN` without special handling.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A plain object converts every key to a string, so `obj[1]` and `obj["1"]` are one slot and `obj[{ id: 7 }]` becomes the key `"[object Object]"`. A Map keeps the key you handed it, which cuts the other way for objects: two structurally identical objects are two different keys, and `map.set({ id: 7 }, x).get({ id: 7 })` is `undefined`.',
        },
        {
          kind: 'prose',
          body:
            'So the deal is narrow and worth stating in one line: you spend memory and give up positional access, and you get `get`, `set`, `has` and `delete` whose expected cost does not grow with the number of entries. The next lesson is about what "expected" leaves out.',
        },
      ],
    },
    {
      id: 'dsa-v1-d03-l2',
      title: 'Sets, and the honest cost story',
      summary: 'Membership without values, why a Set beats a nested scan, and what an adversarial run of collisions does to expected constant time.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MDN — Set',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — Equality comparisons and sameness',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A Set is a Map with the values removed. It answers one question — is this value in here? — and it answers it the same way a Map answers `has`: hash the value, go to the bucket, compare what is there. Key equality is SameValueZero again, so a Set stores `1` and `"1"` separately and collapses two `NaN`s into one entry.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const seen = new Set(['a', 'b', 'a']);\nseen.size;        // 2 — the second 'a' found itself already there\nseen.has('a');    // true\nseen.add('c');\nseen.delete('b'); // true when the value was present, false when it was not\n[...seen];        // ['a', 'c'] — insertion order kept, duplicates gone",
          caption: 'The whole Set surface: add, has, delete, size, and iteration in insertion order.',
        },
        {
          kind: 'prose',
          body:
            'The pattern a Set replaces is the nested scan. You have n things and a list of m things to check them against, and the direct version asks the m-list about every one of the n. That is nm comparisons, and it is quietly quadratic whenever the two lists grow together.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// O(nm): for each of the n tags, includes walks up to m banned entries.\nconst flagged = (tags, banned) => tags.filter(tag => banned.includes(tag));\n\n// Expected O(n + m): build the set once, then one expected-constant test per tag.\nconst flaggedFast = (tags, banned) => {\n  const blocked = new Set(banned);\n  return tags.filter(tag => blocked.has(tag));\n};',
          caption: 'Same output, different growth: building the Set once replaces n scans of the banned list.',
        },
        {
          kind: 'table',
          caption: 'Membership costs, with the case each figure describes.',
          headers: ['Operation', 'Cost', 'Which case that is'],
          rows: [
            ['`array.includes(value)`', 'O(n)', 'A miss reads every element; a hit near the front returns sooner'],
            ['`set.has(value)`', 'Expected O(1)', 'Averaged over keys that spread; a bucket full of collisions degrades toward O(n)'],
            ['`map.get(key)`', 'Expected O(1)', 'The same assumption as `set.has`, with a value attached'],
            ['`new Set(values)`', 'Expected O(n)', 'n insertions, each expected constant'],
            ['Nested scan of n against m', 'O(nm)', 'Every element of one input tested against every element of the other'],
            ['Build a Set of m, then scan n', 'Expected O(n + m)', 'One build of m entries, then n expected-constant tests'],
          ],
        },
        {
          kind: 'prose',
          body:
            '"Expected" is doing real work in those rows. It means the cost averaged over keys, under the assumption that the hash spreads them across the buckets. For the keys an ordinary program uses, that assumption holds and the average is a small fixed number of steps. It is not a statement about every individual lookup, and it is not a guarantee about every possible set of keys.',
        },
        {
          kind: 'trace',
          caption: 'Every key in one bucket: the lookup walks a chain, and the comparison count grows with the entries.',
          trace: {
            shape: 'array',
            legend: ['1st', '2nd', '3rd', '4th', '5th'],
            frames: [
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                note: 'Five keys that all hash to the same bucket. The bucket is now a chain of five entries, and the hash no longer narrows anything down.',
                counter: { label: 'Comparisons', value: 0 },
              },
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                marks: [{ index: 0, role: 'compare' }],
                note: 'Looking up "k5" starts at the front of the chain and compares "k1". Not a match.',
                counter: { label: 'Comparisons', value: 1 },
              },
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'compare' },
                ],
                note: '"k2" is compared next and ruled out. Two comparisons so far, and the chain has three entries left.',
                counter: { label: 'Comparisons', value: 2 },
              },
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'compare' },
                ],
                note: '"k3" is ruled out. Three comparisons, and nothing about the bucket has helped yet.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'compare' },
                ],
                note: '"k4" is ruled out. Four comparisons for a table holding five entries.',
                counter: { label: 'Comparisons', value: 4 },
              },
              {
                cells: ['k1', 'k2', 'k3', 'k4', 'k5'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'settled' },
                ],
                note: 'The fifth comparison matches. With every key in one bucket the lookup cost grows with the number of entries, which is exactly the behaviour the word "expected" excludes.',
                counter: { label: 'Comparisons', value: 5 },
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The ECMAScript specification asks a Map to be implemented with hash tables or another mechanism that, on average, gives access times sublinear in the number of entries. Sublinear on average is a looser promise than constant, and it is the accurate one. Do not write "Map.get is O(1)" in an analysis without saying which case you mean.',
        },
        {
          kind: 'prose',
          body:
            'The gap matters when someone else chooses your keys. A request handler that maps user-supplied strings into a table can be fed a batch of keys that collide, and the chain walk in the trace above is what the server then does on every lookup. Engines defend against this with randomised hashing, and it is still the reason a hard latency bound wants a structure with a worst-case guarantee, such as a balanced tree, rather than a hash table.',
        },
        {
          kind: 'prose',
          body:
            'Deduplicating with `new Set(values)` costs one expected-constant insertion per value, so it is expected linear in time and linear in auxiliary space: the Set holds one entry per distinct value, plus the table slack. `[...new Set(values)]` allocates a second array on top of that. Both are cheap at a thousand values and worth counting at ten million.',
        },
        {
          kind: 'prose',
          body:
            'An array is still the right structure more often than the enthusiasm for hashing suggests. Keep an array when you read the data in order rather than by key, when you index by position, when duplicates are the data rather than noise, when you need the smallest or largest value or a range, or when there are twelve entries and the constant factor of hashing is the only thing you would be adding.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Do not settle any of this with a stopwatch. A wall-clock measurement reports your machine, the engine\'s optimiser and whatever else was running at the time, and it cannot distinguish a large constant factor from a different growth class. Count the operations — comparisons, reads, insertions — and reason about how the count grows.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d03-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: what a hash map buys',
      summary: 'Hashing a key to its bucket, the memory that pays for it, and where Map and a plain object part ways.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d03-l1',
    },
    {
      id: 'dsa-v1-d03-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: sets, and the honest cost story',
      summary: 'Membership with a Set, O(n + m) against O(nm), and what a run of collisions does to expected constant time.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d03-l2',
    },
    {
      id: 'dsa-v1-d03-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Map and Set checks',
      summary: 'Four questions: what expected constant claims, a nested scan against a Set, how duplicates land, and when an array still wins.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d03-q1',
          prompt: '`seen` is a `Map` holding a million entries. Which description of `seen.get(key)` is accurate?',
          options: [
            'Expected constant: with keys that spread across buckets the cost does not grow with the entry count, though a run of collisions pushes an individual lookup toward linear.',
            'Guaranteed constant: the specification requires the same number of steps whatever the Map holds.',
            'Logarithmic: a Map keeps its keys in sorted order, so `get` halves the search range at each step.',
            'Linear: `get` walks the entries in insertion order until the key matches.',
          ],
          correct: 0,
          explanation:
            'The specification asks for access times that are sublinear on average, not constant in every case, so the guarantee in the second option does not exist. A Map iterates in insertion order but never sorts its keys, so there is no range to halve. And it does not scan: the hash sends the lookup to one bucket, which is why the normal case is a small fixed number of comparisons rather than a traversal.',
          competencies: ['maps-sets', 'complexity'],
        },
        {
          id: 'dsa-v1-d03-q2',
          prompt: '`tags` has n entries and `banned` has m entries, and the two lengths are unrelated. What is the tightest growth class for `flagged`, and what does putting `banned` into a `Set` first change?',
          context: {
            language: 'javascript',
            code: 'const flagged = (tags, banned) => {\n  const out = [];\n  for (const tag of tags) {\n    if (banned.includes(tag)) out.push(tag);\n  }\n  return out;\n};',
          },
          options: [
            'O(nm) as written; building a Set of `banned` once makes it expected O(n + m).',
            'O(n + m) as written; a Set changes nothing, because `includes` already stops at the first match.',
            'O(n²) as written; a Set makes it expected O(n).',
            'O(nm) as written; a Set makes it expected O(n), because building the Set costs nothing.',
          ],
          correct: 0,
          explanation:
            '`includes` scans `banned`, so the body costs up to m for each of the n tags: nm. Stopping early on a match does not change the class, because a miss still reads all m. Calling it O(n²) assumes the two inputs grow together and hides which list to shrink. And the Set has to be built, which reads `banned` once, so the m never disappears — it moves from a repeated factor to a one-off term.',
          competencies: ['maps-sets', 'complexity'],
        },
        {
          id: 'dsa-v1-d03-q3',
          prompt: 'After this code runs, what are `seen.size` and `counts.get("a")`?',
          context: {
            language: 'javascript',
            code: "const values = ['a', 'b', 'a', 'c', 'b', 'a', 'd'];\nconst seen = new Set(values);\nconst counts = new Map();\nfor (const value of values) counts.set(value, (counts.get(value) || 0) + 1);",
          },
          options: ['4 and 3', '7 and 3', '4 and 1', '4 and 7'],
          correct: 0,
          explanation:
            "The Set keeps one entry per distinct value, so the seven values collapse to the four distinct ones: 'a', 'b', 'c', 'd'. `counts.set` replaces whatever the key held, but the line reads the old count back with `get` before adding one, so 'a' ends at 3 rather than 1. The counter is per key, not a running total of everything seen, so 7 is the length of the input rather than any entry in the Map.",
          competencies: ['maps-sets'],
        },
        {
          id: 'dsa-v1-d03-q4',
          prompt: 'A component holds twelve configuration entries, walks all of them in a fixed order on every render, and never looks one up by key. Which structure fits, and why?',
          options: [
            'An array: the access is iteration in order, so hashing and the extra table slots buy nothing at twelve entries.',
            'A Map: expected constant lookup makes every access cheaper than an array index would be.',
            'A Set: dropping duplicates is what makes ordered iteration cheap.',
            'A Map: only a Map has a defined iteration order, so a fixed order needs one.',
          ],
          correct: 0,
          explanation:
            'No lookup by key ever happens, so the operation a Map optimises is not in the workload; an array index is already constant, so there is nothing for expected constant to beat. A Set would silently drop entries that repeat, which is a change in the data rather than a speed-up. And an array has had a defined order since the beginning — the Map guarantee is worth citing against a plain object, not against an array.',
          competencies: ['maps-sets', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d03-frequency-map',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Frequency map',
      summary: 'Count how often each value appears, keyed by the value itself and ordered by first appearance.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          "Write `countFrequencies(values)`, returning a `Map` from each value in the array to how many times it appears. `countFrequencies(['a', 'b', 'a'])` returns a Map holding `'a' → 2` and `'b' → 1`.\n\nThe keys must come out in order of first appearance, which a Map gives you for free as long as you insert each key the first time you meet it. An empty array returns an empty Map, not `null` and not an empty object. Values keep their type: `1` and `'1'` are two different keys, and so are `true` and `1`.\n\nOne pass over the array is enough. The tests read the result with `[...map.entries()]`, because a Map is not comparable as JSON.",
        contract: [
          'Return a `Map`, never a plain object and never an array of pairs.',
          'Key each entry by the value itself, so `1` and `\'1\'` stay separate.',
          'Keys iterate in order of first appearance; an empty array returns an empty Map.',
        ],
        starter: `const countFrequencies = values => {

};

// Scratch pad — change this and press Run.
console.log([...countFrequencies(['a', 'b', 'a']).entries()]);
`,
        skeleton: `const countFrequencies = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // read the count this value already has, or zero, and store one more
  }

  return counts;
};`,
        hints: [
          'Start with `new Map()`. For each value, `counts.get(value)` is `undefined` the first time, so treat that as zero before adding one.',
          'A Map keeps keys in insertion order, so the order comes out right on its own — as long as the first `set` for a key happens when you first meet it, which a single left-to-right pass guarantees.',
        ],
        approach: [
          'Create an empty Map to hold the counts.',
          'Walk the array once, binding each value.',
          'Read the current count for that value, treating a missing entry as zero.',
          'Store the count plus one under the same key.',
          'Return the Map; an empty input never enters the loop and returns it empty.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct count for every distinct value',
            critical: true,
            weight: 3,
            detail: 'Check an empty array, a value that repeats, and values whose types differ but whose text looks the same.',
          },
          {
            id: 'first-appearance-order',
            label: 'Keys in order of first appearance',
            critical: true,
            weight: 2,
            detail:
              'The keys came out in the wrong order. Counting into a plain object and converting at the end does this: object keys that look like integers iterate in ascending numeric order, whatever order you wrote them in.',
          },
        ],
        tests: [
          { call: "(() => [...countFrequencies(['a', 'b', 'a']).entries()])()", expected: [['a', 2], ['b', 1]] },
          { call: '(() => [...countFrequencies([]).entries()])()', expected: [], label: 'an empty array gives an empty Map', edge: true },
          { call: 'countFrequencies([]) instanceof Map', expected: true, label: 'the return value is a Map', edge: true },
          {
            call: '(() => [...countFrequencies([10, 2, 10, 30, 2, 10]).keys()])()',
            expected: [10, 2, 30],
            label: 'keys follow first appearance, not numeric order',
            criterion: 'first-appearance-order',
          },
          {
            call: "(() => [...countFrequencies([1, '1', 1]).entries()])()",
            expected: [[1, 2], ['1', 1]],
            label: 'the number 1 and the string \'1\' are separate keys',
            edge: true,
          },
          { call: "countFrequencies(['x', 'x', 'x']).get('x')", expected: 3, label: 'a value that only repeats' },
        ],
      },
    },
    {
      id: 'dsa-v1-d03-first-unique',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'First unique value',
      summary: 'Find the first value that appears exactly once, using a counting pass and then an order-preserving one.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `firstUnique(values)`, returning the first value in the array that appears exactly once. `firstUnique(['a', 'b', 'a', 'c'])` returns `'b'`, because `'a'` appears twice and `'b'` is the earliest value that does not. Return `null` when every value repeats, and `null` for an empty array.\n\nTwo passes are the expected shape and are entirely fine: one to count, one to walk the array in order and return the first value whose count is 1. That is O(n) time overall, and O(n) auxiliary space for the counts.\n\nValues keep their type, so `0` and `'0'` are different values, and so are `false` and `0`.",
        contract: [
          'Return the first qualifying value in the array\'s own order, not the first key of your counting structure.',
          'Return `null` — not `undefined`, not `-1` — when no value appears exactly once.',
          'Compare values by identity, so `0` and `\'0\'` never share a count.',
        ],
        starter: `const firstUnique = values => {

};

// Scratch pad — change this and press Run.
console.log(firstUnique(['a', 'b', 'a', 'c']));
`,
        skeleton: `const firstUnique = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // count this value
  }

  for (/* each value again, in order */) {
    // return it as soon as its count is exactly 1
  }

  return /* nothing qualified */;
};`,
        hints: [
          'The first pass builds the same value-to-count Map as the frequency exercise. The second pass is what makes the answer the *first* one: walk the original array again and return the first value whose count is 1.',
          'Returning the first key of the Map whose count is 1 happens to work here too, since a Map keeps insertion order — but walking the array is the version that stays correct if the counting structure ever changes.',
          'Reaching the end of the second pass means nothing appeared exactly once, so return `null` there rather than falling off the end.',
        ],
        approach: [
          'Build a Map from each value to the number of times it appears.',
          'Walk the original array a second time, in order.',
          'Return the first value whose stored count is exactly 1.',
          'Return `null` if the second pass finishes without a match.',
        ],
        tests: [
          { call: "firstUnique(['a', 'b', 'a', 'c'])", expected: 'b' },
          { call: 'firstUnique([])', expected: null, label: 'an empty array has no unique value', edge: true },
          { call: 'firstUnique([2, 2, 3, 3])', expected: null, label: 'every value repeats', edge: true },
          { call: 'firstUnique([7, 3, 7, 3, 9])', expected: 9, label: 'the only unique value is the last one' },
          { call: "firstUnique([0, '0'])", expected: 0, label: 'the number 0 and the string \'0\' are different values', edge: true },
          { call: 'firstUnique([4])', expected: 4, label: 'a single element is unique', edge: true },
        ],
      },
    },
    {
      id: 'dsa-v1-d03-set-intersection',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Intersection with a set',
      summary: 'The values two arrays share, each once, in the order the left array introduced them.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'Write `intersection(left, right)`, returning an array of the values that appear in both inputs. `intersection([1, 2, 3, 4], [3, 4, 5])` returns `[3, 4]`.\n\nEach shared value appears in the output once, in the order it first appears in `left`. Duplicates in either input must not duplicate the output: `intersection([2, 2, 3], [3, 2])` is `[2, 3]`. When either input is empty, or the two share nothing, return `[]`.\n\nNeither input may be modified. Build a Set from `right` and test each element of `left` against it, which costs expected O(n + m) instead of the O(nm) a nested scan would spend.',
        contract: [
          'Return a new array; leave both `left` and `right` exactly as they were.',
          'Each shared value appears once, in the order it first appears in `left`.',
          'An empty input, or no shared values, returns an empty array.',
        ],
        starter: `const intersection = (left, right) => {

};

// Scratch pad — change this and press Run.
console.log(intersection([1, 2, 3, 4], [3, 4, 5]));
`,
        skeleton: `const intersection = (left, right) => {
  const pool = /* a Set of everything in right */;
  const taken = /* a Set of what you have already added */;
  const out = [];

  for (/* each value in left */) {
    // add it when right holds it and you have not added it yet
  }

  return out;
};`,
        hints: [
          '`new Set(right)` gives you membership in expected constant time, so the loop over `left` never scans `right` again.',
          'Membership alone is not enough: `left` can repeat a shared value. Keep a second Set of the values you have already pushed, and skip anything already in it.',
          'Pushing onto a fresh array keeps both inputs untouched. Sorting, splicing or filtering in place would not.',
        ],
        approach: [
          'Build a Set from `right`.',
          'Create an empty Set for the values already added, and an empty output array.',
          'Walk `left` in order.',
          'Push a value when the `right` Set holds it and the added Set does not, then record it as added.',
          'Return the output array.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct shared values, inputs untouched',
            critical: true,
            weight: 3,
            detail: 'Check empty inputs, no overlap, complete overlap, and that neither argument comes back changed.',
          },
          {
            id: 'duplicate-free',
            label: 'Each value once, in the order `left` introduces it',
            critical: true,
            weight: 2,
            detail:
              'A repeated value came out twice, or the order followed `right` instead of `left`. Membership in `right` is only half the test; you also have to remember what you already pushed.',
          },
        ],
        tests: [
          { call: 'intersection([1, 2, 3, 4], [3, 4, 5])', expected: [3, 4] },
          { call: 'intersection([], [1, 2])', expected: [], label: 'an empty left side gives an empty array', edge: true },
          { call: 'intersection([1, 2], [])', expected: [], label: 'an empty right side gives an empty array', edge: true },
          { call: 'intersection([1, 2, 3], [4, 5])', expected: [], label: 'nothing in common', edge: true },
          {
            call: 'intersection([2, 2, 3, 3], [3, 2])',
            expected: [2, 3],
            label: 'duplicates in left appear once, in first-appearance order',
            criterion: 'duplicate-free',
          },
          {
            call: 'intersection([5, 6], [6, 6, 6])',
            expected: [6],
            label: 'duplicates in right do not duplicate the output',
            criterion: 'duplicate-free',
          },
          {
            call: "intersection(['b', 'a'], ['a', 'b'])",
            expected: ['b', 'a'],
            label: 'the order follows left, not right',
            criterion: 'duplicate-free',
          },
        ],
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d03-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-frequency-map', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-first-unique', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-set-intersection', state: 'verified_pass' },
  ],
};
