/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D03_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d03-l1",
    "title": "What a hash map buys",
    "summary": "Hashing a key straight to its slot, the memory that pays for it, and how a Map differs from a plain object.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MDN — Map",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "For an unsorted array without a search index, a membership miss can require a full traversal. A sorted sequence can support other search techniques; this comparison starts with the unsorted case. In this lesson, a hash table has bounded load and constant-cost key hashing/comparison. It changes the question from \"where is it?\" to \"where would it have to be?\" — it computes a slot from the key itself and looks only there."
      },
      {
        "kind": "prose",
        "body": "That computation is the hash function. It turns a key into a bucket index, deterministically: with fixed table capacity and hash configuration, the same key lands in the same bucket. Store the entry there, and a later lookup hashes the key again, goes straight to that bucket, and compares only what it finds. The bucket index also depends on table capacity and changes during resizing. With well-distributed hashes and a bounded load factor, the expected bucket search is constant; arbitrary key-length costs are outside that model."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// One traversal per lookup: a thousand lookups over a thousand users\n// can cost a million comparisons in the worst case (for example, misses).\nconst findUser = (users, id) => users.find(user => user.id === id);\n\n// Assume unique ids; duplicate ids would make find return the first user\n// while Map construction retains the last. Under the hash-table model:\n// one traversal to build, then expected constant work per lookup.\nconst byId = new Map(users.map(user => [user.id, user]));\nconst findFast = id => byId.get(id);",
        "caption": "The trade: one linear pass and extra memory up front, then expected constant lookups under the stated hash-table assumptions."
      },
      {
        "kind": "prose",
        "body": "A hash function has to do two jobs. It has to be deterministic, or a stored entry becomes unfindable. And it has to spread keys across the buckets, because two keys that land in the same bucket have to be told apart by comparison, and comparisons are the part that grows."
      },
      {
        "kind": "trace",
        "caption": "Four keys hashed into eight buckets, including one collision.",
        "trace": {
          "shape": "array",
          "legend": [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7"
          ],
          "frames": [
            {
              "cells": [
                "·",
                "·",
                "·",
                "·",
                "·",
                "·",
                "·",
                "·"
              ],
              "note": "Eight empty buckets. The table has room for more entries than it holds, and that slack is deliberate."
            },
            {
              "cells": [
                "·",
                "·",
                "·",
                "ana",
                "·",
                "·",
                "·",
                "·"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "The hash of \"ana\" is 3, so \"ana\" is written into bucket 3. No other bucket was touched."
            },
            {
              "cells": [
                "·",
                "·",
                "·",
                "ana",
                "·",
                "·",
                "bo",
                "·"
              ],
              "marks": [
                {
                  "index": 6,
                  "role": "active"
                }
              ],
              "note": "The hash of \"bo\" is 6. Storing it costs the same as storing \"ana\" did, even though the table is no longer empty."
            },
            {
              "cells": [
                "·",
                "·",
                "·",
                "ana, cyril",
                "·",
                "·",
                "bo",
                "·"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "\"cyril\" hashes to 3 as well. Bucket 3 now holds two entries, so anything landing there has to compare keys."
            },
            {
              "cells": [
                "·",
                "·",
                "·",
                "ana, cyril",
                "·",
                "·",
                "bo",
                "·"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 6,
                  "role": "excluded"
                }
              ],
              "note": "Looking up \"cyril\" hashes once to bucket 3 and compares the two keys there. Bucket 6 and the five empty buckets were never read."
            }
          ]
        }
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Memory is what pays for the speed. A hash table keeps more buckets than entries so collisions stay rare, and it grows and rehashes when the entries catch up with the buckets. A bounded-load hash-table model uses O(n) entries and bucket storage, with implementation-dependent overhead. JavaScript Map may use another representation; whether that overhead matters depends on the workload and memory limit."
      },
      {
        "kind": "prose",
        "body": "JavaScript gives you two keyed containers, and they are not interchangeable. A plain object was a keyed store before `Map` existed, and it still works for string-keyed records. `Map` was added for the cases the object handles badly."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const counts = new Map();\ncounts.set('ana', 1);\ncounts.set('ana', counts.get('ana') + 1); // 2 — set replaces, get reads the old value back\ncounts.has('bo');                          // false\ncounts.size;                               // 1\n\nconst key = { id: 7 };\ncounts.set(key, 'stored under this exact object');\ncounts.get(key);                           // 'stored under this exact object'\ncounts.get({ id: 7 });                     // undefined — a different object",
        "caption": "set, get, has and size, and the identity rule that governs object keys."
      },
      {
        "kind": "table",
        "caption": "Where a Map and a plain object actually differ.",
        "headers": [
          "Question",
          "Map",
          "Plain object"
        ],
        "rows": [
          [
            "Which keys are allowed?",
            "Any value: strings, numbers, booleans, objects, functions, NaN",
            "Strings and symbols; every other key is converted to a string first"
          ],
          [
            "What order do entries come out in?",
            "Insertion order, for every key",
            "Reflect.ownKeys: canonical array-index names first numerically, other strings next, then symbols; each latter group keeps insertion order"
          ],
          [
            "How many entries are there?",
            "`map.size`, read directly",
            "`Object.keys(obj).length` allocates and counts only own enumerable string keys; Reflect.ownKeys includes symbols and nonenumerable own keys"
          ],
          [
            "Can a key arrive that you never set?",
            "No — a Map holds only what you put in it",
            "`toString` and other prototype names answer `in` unless you build with `Object.create(null)`"
          ],
          [
            "How do you iterate it?",
            "`for…of` over the Map, or over `keys`, `values`, `entries`",
            "`Object.entries(obj)`, which allocates an array of pairs"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "Key equality in a Map follows SameValueZero. Two keys match when they are the same value, like `===` except that NaN matches NaN. Both === and SameValueZero already treat 0 and -0 as equal. So `1` and `\"1\"` are two separate keys, `true` and `1` are two separate keys, and a Map can count occurrences of `NaN` without special handling."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Ordinary object keys become strings or symbols through property-key conversion. Non-Symbol primitive keys such as numbers become strings, so `obj[1]` and `obj[\"1\"]` are one slot and `obj[{ id: 7 }]` becomes the key `\"[object Object]\"`. A Map keeps the key you handed it, which cuts the other way for objects: two structurally identical objects are two different keys, and `map.set({ id: 7 }, x).get({ id: 7 })` is `undefined`."
      },
      {
        "kind": "prose",
        "body": "So the deal is narrow and worth stating in one line: you spend memory and give up positional access, and you get `get`, `set`, `has` and `delete` with expected constant lookup costs under the bounded-key hash-table model, while JavaScript guarantees only sublinear average access. The next lesson is about what \"expected\" leaves out."
      }
    ]
  },
  {
    "id": "dsa-v1-d03-l2",
    "title": "Sets, and the honest cost story",
    "summary": "Membership without values, why a Set beats a nested scan, and what an adversarial run of collisions does to expected constant time.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MDN — Set",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Equality comparisons and sameness",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A Set stores membership without attached values. A hash-based Set follows the same bucket model; JavaScript does not require that exact representation. It answers one question — is this value in here? — and it answers it the same way a Map answers `has`: hash the value, go to the bucket, compare what is there. Key equality is SameValueZero again, so a Set stores `1` and `\"1\"` separately and collapses two `NaN`s into one entry."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const seen = new Set(['a', 'b', 'a']);\nseen.size;        // 2 — the second 'a' found itself already there\nseen.has('a');    // true\nseen.add('c');\nseen.delete('b'); // true when the value was present, false when it was not\n[...seen];        // ['a', 'c'] — insertion order kept, duplicates gone",
        "caption": "Common Set operations: add, has, delete, size, and iteration in insertion order."
      },
      {
        "kind": "prose",
        "body": "The pattern a Set replaces is the nested scan. You have n things and a list of m things to check them against, and the direct version asks the m-list about every one of the n. The worst case has up to nm comparisons; it is quadratic in a shared size when both lists grow proportionally. Short-circuit hits can do less work."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// O(nm): for each of the n tags, includes walks up to m banned entries.\nconst flagged = (tags, banned) => tags.filter(tag => banned.includes(tag));\n\n// Expected O(n + m): build the set once, then one expected-constant test per tag.\nconst flaggedFast = (tags, banned) => {\n  const blocked = new Set(banned);\n  return tags.filter(tag => blocked.has(tag));\n};",
        "caption": "Same output, different growth: building the Set once replaces n scans of the banned list."
      },
      {
        "kind": "table",
        "caption": "Membership costs, with the case each figure describes.",
        "headers": [
          "Operation",
          "Cost",
          "Which case that is"
        ],
        "rows": [
          [
            "`array.includes(value)`",
            "O(n)",
            "A miss reads every element; a hit near the front returns sooner"
          ],
          [
            "`set.has(value)`",
            "Expected O(1)",
            "Averaged over keys that spread; a bucket full of collisions degrades toward O(n)"
          ],
          [
            "`map.get(key)`",
            "Expected O(1)",
            "The same assumption as `set.has`, with a value attached"
          ],
          [
            "`new Set(values)`",
            "Expected O(n)",
            "n insertions, each expected constant"
          ],
          [
            "Nested scan of n against m",
            "O(nm)",
            "Every element of one input tested against every element of the other"
          ],
          [
            "Build a Set of m, then scan n",
            "Expected O(n + m)",
            "One build of m entries, then n expected-constant tests"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "\"Expected\" is doing real work in those rows. It refers to an expectation under a suitable key/hashing distribution and bounded load. Resizing can add occasional linear work; spreading that work over insertions is an amortized argument, distinct from the expected bucket search. This expectation requires a suitable hashing distribution, bounded load and bounded key-hashing/equality work; it is an assumption to state, not a promise about every workload. It is not a statement about every individual lookup, and it is not a guarantee about every possible set of keys."
      },
      {
        "kind": "trace",
        "caption": "Every key in one bucket: the lookup walks a chain, and the comparison count grows with the entries.",
        "trace": {
          "shape": "array",
          "legend": [
            "1st",
            "2nd",
            "3rd",
            "4th",
            "5th"
          ],
          "frames": [
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "note": "Five keys that all hash to the same bucket. The bucket is now a chain of five entries, and the hash no longer narrows anything down.",
              "counter": {
                "label": "Comparisons",
                "value": 0
              }
            },
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "compare"
                }
              ],
              "note": "Looking up \"k5\" starts at the front of the chain and compares \"k1\". Not a match.",
              "counter": {
                "label": "Comparisons",
                "value": 1
              }
            },
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "compare"
                }
              ],
              "note": "\"k2\" is compared next and ruled out. Two comparisons so far, and the chain has three entries left.",
              "counter": {
                "label": "Comparisons",
                "value": 2
              }
            },
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "excluded"
                },
                {
                  "index": 2,
                  "role": "compare"
                }
              ],
              "note": "\"k3\" is ruled out. Three comparisons, and nothing about the bucket has helped yet.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "excluded"
                },
                {
                  "index": 2,
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "\"k4\" is ruled out. Four comparisons for a table holding five entries.",
              "counter": {
                "label": "Comparisons",
                "value": 4
              }
            },
            {
              "cells": [
                "k1",
                "k2",
                "k3",
                "k4",
                "k5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "excluded"
                },
                {
                  "index": 2,
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "settled"
                }
              ],
              "note": "The fifth comparison matches. With every key in one bucket the lookup cost grows with the number of entries, which is exactly the behaviour the word \"expected\" excludes.",
              "counter": {
                "label": "Comparisons",
                "value": 5
              }
            }
          ]
        }
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The ECMAScript specification asks a Map to be implemented with hash tables or another mechanism that, on average, gives access times sublinear in the number of entries. Sublinear on average is a looser promise than constant, and it is the accurate one. Do not write \"Map.get is O(1)\" in an analysis without saying which case you mean."
      },
      {
        "kind": "prose",
        "body": "The gap matters when someone else chooses your keys. In a chained hash table, deliberately colliding keys can force long bucket walks. Implementations may mitigate collisions or use a different structure; do not assume the illustrated attack applies unchanged to every JavaScript Map. A structure with worst-case operation bounds can help when those bounds matter, but key-comparison cost and runtime scheduling still affect latency."
      },
      {
        "kind": "prose",
        "body": "Deduplicating with `new Set(values)` costs one expected-constant insertion per value, so it is expected linear in time and linear in auxiliary space: the Set holds one entry per distinct value, plus the table slack. `[...new Set(values)]` allocates a second array on top of that. Both are cheap at a thousand values and worth counting at ten million."
      },
      {
        "kind": "prose",
        "body": "An array is still the right structure more often than the enthusiasm for hashing suggests. Keep an array when you read the data in order rather than by key, when you index by position, when duplicates are the data rather than noise, when you need the smallest or largest value or a range, or when there are twelve entries and the constant factor of hashing is the only thing you would be adding."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Do not settle any of this with a stopwatch. A wall-clock measurement reports your machine, the engine's optimiser and whatever else was running at the time, and it cannot distinguish a large constant factor from a different growth class. Count the operations — comparisons, reads, insertions — and reason about how the count grows."
      }
    ]
  }
];
