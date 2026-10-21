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
          reviewedOn: '2026-10-14',
        },
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-10-14' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'For an unsorted array without a search index, a membership miss can require a full traversal. A sorted sequence can support other search techniques; this comparison starts with the unsorted case. In this lesson, a hash table has bounded load and constant-cost key hashing/comparison. It changes the question from "where is it?" to "where would it have to be?" — it computes a slot from the key itself and looks only there.',
        },
        {
          kind: 'prose',
          body:
            'That computation is the hash function. It turns a key into a bucket index, deterministically: with fixed table capacity and hash configuration, the same key lands in the same bucket. Store the entry there, and a later lookup hashes the key again, goes straight to that bucket, and compares only what it finds. The bucket index also depends on table capacity and changes during resizing. With well-distributed hashes and a bounded load factor, the expected bucket search is constant; arbitrary key-length costs are outside that model.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// One traversal per lookup: a thousand lookups over a thousand users\n// can cost a million comparisons in the worst case (for example, misses).\nconst findUser = (users, id) => users.find(user => user.id === id);\n\n// Assume unique ids; duplicate ids would make find return the first user\n// while Map construction retains the last. Under the hash-table model:\n// one traversal to build, then expected constant work per lookup.\nconst byId = new Map(users.map(user => [user.id, user]));\nconst findFast = id => byId.get(id);',
          caption: 'The trade: one linear pass and extra memory up front, then expected constant lookups under the stated hash-table assumptions.',
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
            'Memory is what pays for the speed. A hash table keeps more buckets than entries so collisions stay rare, and it grows and rehashes when the entries catch up with the buckets. A bounded-load hash-table model uses O(n) entries and bucket storage, with implementation-dependent overhead. JavaScript Map may use another representation; whether that overhead matters depends on the workload and memory limit.',
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
              'Reflect.ownKeys: canonical array-index names first numerically, other strings next, then symbols; each latter group keeps insertion order',
            ],
            ['How many entries are there?', '`map.size`, read directly', '`Object.keys(obj).length` allocates and counts only own enumerable string keys; Reflect.ownKeys includes symbols and nonenumerable own keys'],
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
            'Key equality in a Map follows SameValueZero. Two keys match when they are the same value, like `===` except that NaN matches NaN. Both === and SameValueZero already treat 0 and -0 as equal. So `1` and `"1"` are two separate keys, `true` and `1` are two separate keys, and a Map can count occurrences of `NaN` without special handling.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Ordinary object keys become strings or symbols through property-key conversion. Non-Symbol primitive keys such as numbers become strings, so `obj[1]` and `obj["1"]` are one slot and `obj[{ id: 7 }]` becomes the key `"[object Object]"`. A Map keeps the key you handed it, which cuts the other way for objects: two structurally identical objects are two different keys, and `map.set({ id: 7 }, x).get({ id: 7 })` is `undefined`.',
        },
        {
          kind: 'prose',
          body:
            'So the deal is narrow and worth stating in one line: you spend memory and give up positional access, and you get `get`, `set`, `has` and `delete` with expected constant lookup costs under the bounded-key hash-table model, while JavaScript guarantees only sublinear average access. The next lesson is about what "expected" leaves out.',
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
          reviewedOn: '2026-10-14',
        },
        {
          label: 'MDN — Equality comparisons and sameness',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness',
          reviewedOn: '2026-10-14',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A Set stores membership without attached values. A hash-based Set follows the same bucket model; JavaScript does not require that exact representation. It answers one question — is this value in here? — and it answers it the same way a Map answers `has`: hash the value, go to the bucket, compare what is there. Key equality is SameValueZero again, so a Set stores `1` and `"1"` separately and collapses two `NaN`s into one entry.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const seen = new Set(['a', 'b', 'a']);\nseen.size;        // 2 — the second 'a' found itself already there\nseen.has('a');    // true\nseen.add('c');\nseen.delete('b'); // true when the value was present, false when it was not\n[...seen];        // ['a', 'c'] — insertion order kept, duplicates gone",
          caption: 'Common Set operations: add, has, delete, size, and iteration in insertion order.',
        },
        {
          kind: 'prose',
          body:
            'The pattern a Set replaces is the nested scan. You have n things and a list of m things to check them against, and the direct version asks the m-list about every one of the n. The worst case has up to nm comparisons; it is quadratic in a shared size when both lists grow proportionally. Short-circuit hits can do less work.',
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
            '"Expected" is doing real work in those rows. It refers to an expectation under a suitable key/hashing distribution and bounded load. Resizing can add occasional linear work; spreading that work over insertions is an amortized argument, distinct from the expected bucket search. This expectation requires a suitable hashing distribution, bounded load and bounded key-hashing/equality work; it is an assumption to state, not a promise about every workload. It is not a statement about every individual lookup, and it is not a guarantee about every possible set of keys.',
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
            'The gap matters when someone else chooses your keys. In a chained hash table, deliberately colliding keys can force long bucket walks. Implementations may mitigate collisions or use a different structure; do not assume the illustrated attack applies unchanged to every JavaScript Map. A structure with worst-case operation bounds can help when those bounds matter, but key-comparison cost and runtime scheduling still affect latency.',
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
          prompt: '`seen` is a JavaScript Map with n entries. What access-time guarantee does the language specification require?',
          options: [
            'Average access must be sublinear in n; constant expected lookup is a hash-table model, not a universal Map guarantee.',
            'Every lookup must be worst-case constant; growing the table or colliding keys cannot increase its operation count.',
            'Every lookup must be logarithmic because Map sorts its keys and repeatedly halves the remaining search range.',
            'Every lookup must be linear because get walks entries in insertion order until it reaches the matching key.',
          ],
          correct: 0,
          explanation:
            'The specification requires sublinear average access. A hash table or another suitable representation can meet it; expected constant lookup needs additional hash-table assumptions. Insertion order describes iteration, not a required get algorithm. Map need not sort keys or scan them in insertion order, and it promises no universal constant worst-case operation count.',
          competencies: ['maps-sets', 'complexity'],
        },
        {
          id: 'dsa-v1-d03-q2',
          prompt: 'Assume bounded key comparisons/hashing and expected constant Set operations. `tags` has n entries and `banned` has m, with n,m ≥ 1 and unrelated lengths. What is the tightest worst-case class for `flagged`, and the expected class after building a Set once?',
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
          "Write `countFrequencies(values)` for a dense array of JavaScript values. Return a Map from each distinct value to its positive occurrence count, with keys in first-appearance order. Use Map's SameValueZero equality: NaN matches NaN, signed zeros are equal, and objects/symbols keep their identity. `1` and `\"1\"` are separate keys. Empty input returns a new empty Map. Preserve the input array.\n\nTarget: O(n) time, where n is input entries, assuming bounded key hashing/comparison and average constant Map operations. JavaScript requires only sublinear average access; the tests check counts, equality and order, not arbitrary runtime growth.",
        contract: ["Return a new Map with counts for every distinct value and leave the input array unchanged.", "Use SameValueZero key equality, with object and symbol identity preserved.", "Iterate keys in first-appearance order, including mixed-type values."],
        starter: `const countFrequencies = values => {

};

// Scratch pad — change this before submitting.
console.log([...countFrequencies(['a', 'b', 'a']).entries()]);
`,
        skeleton: `const countFrequencies = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // read the count this value already has, or zero, and store one more
  }

  return counts;
};`,
        hints: ["A repeated value needs its earlier count, while a new value needs an initial count. Avoid converting keys to strings.", "Updating an existing Map key does not change its insertion position. Consider how that preserves first appearance."],
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
          "Write `firstUnique(values)` for a dense array of JavaScript values. Return the earliest input value that appears exactly once, or null when there is none, including empty input. Compare using SameValueZero: NaN equals NaN, signed zeros are equal, and object/symbol identities stay distinct. A qualifying undefined or null value is returned as that value; the null sentinel need not distinguish a found null. Either zero sign is acceptable. Preserve the input array.\n\nA counting pass followed by an input-order or insertion-ordered Map scan is one approach. Target: O(n) time, where n is input entries, under bounded key-cost and average constant Map operations. These are model assumptions, not a universal Map time guarantee.",
        contract: ["Return the earliest qualifying value under SameValueZero equality; object and symbol values keep their identity.", "Return null when none qualifies. A qualifying undefined remains undefined, and either zero sign is acceptable.", "Preserve the input array; iteration over an insertion-ordered Map can preserve first-appearance order."],
        starter: `const firstUnique = values => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Seeing a value once is not enough to know it stays unique. Decide what information survives when it appears later.", "After counting, identify the earliest qualifying value; numeric object-property order can differ from the input order.", "A falsey value may still be the correct result. Distinguish finding it from reaching the end without any qualifying value."],
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
          "Write `intersection(left, right)` for two dense arrays of JavaScript values. Return a new array of values present in both, each once, in their first-appearance order in left. Use SameValueZero equality: NaN equals NaN, signed zeros are equal, and objects/symbols match by identity. Values retain their type; use the representative from left, except either sign of zero is acceptable. Preserve both inputs. Empty input or no overlap returns a new empty array.\n\nBuilding a Set from right once and scanning left is one approach. Target: O(n + m) time, where n and m are the input lengths, assuming bounded key costs and average constant Set operations. Correct slower alternatives can pass semantic checks; the tests do not prove arbitrary complexity.",
        contract: ["Return a fresh output array for every input, including empty cases; preserve both inputs.", "Each shared SameValueZero class appears once, in first-appearance order from left.", "Object/symbol identities and value types are preserved; either zero sign is acceptable."],
        starter: `const intersection = (left, right) => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Membership answers whether right contains a value. What additional information prevents the same shared value from being emitted twice?", "Choose which input controls the output order. Keep the original arrays separate from any result-building state.", "Check repeated values, mixed types and NaN against the equality rule before choosing a membership test."],
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
