import type { LessonSource } from '../types';
/** Original lessons with primary references; no adapted source examples. */
export const DSA_ADVANCED_LESSONS: LessonSource[] = [
  {
    "id": "dsaa-learn-representation",
    "title": "Represent priorities and relationships",
    "summary": "Choose a representation by its invariant and the queries it must support.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: binary heaps",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec8/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: graphs and BFS",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec9/",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A min-heap is a complete binary tree whose parent is no greater than either child. Completeness packs it into an array: zero-based children of i are 2i+1 and 2i+2. The minimum is at the root; the remaining array is not sorted. Peeking reads one position. Insertion repairs upward and root removal repairs downward through at most a logarithmic height. Bottom-up construction is linear because most nodes have little distance to fall; repeated removal still makes heap sort O(n log n)."
      },
      {
        "kind": "prose",
        "body": "A graph stores vertices and edges. Directed edges have a source and destination; undirected edges connect both ways. Keep an entry for an isolated vertex even when it has no neighbors. Adjacency lists take O(V+E) space, with two neighbor entries per undirected edge. A matrix reserves V squared cells but checks one ordered pair in constant indexed work. Out-degree counts outgoing edges; in-degree counts incoming edges."
      },
      {
        "kind": "prose",
        "body": "Name whether parallel edges and self-loops are allowed before building a representation. A list can preserve duplicates and neighbor order, while a set changes multiplicity. Choose those semantics deliberately."
      }
    ]
  },
  {
    "id": "dsaa-learn-graph-search",
    "title": "Traverse graphs and preserve path meaning",
    "summary": "Relate frontier order, edge weights and predecessor records.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: breadth-first search",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec9/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: depth-first search",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec10/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: Dijkstra",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec13/",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "BFS marks vertices when enqueuing them in a FIFO queue. Its layers give fewest-edge paths when every edge has the same positive cost. DFS explores a branch before its siblings; a directed edge to an active ancestor proves a cycle. A full traversal forest starts again at unvisited vertices, taking O(V+E) with adjacency lists. Recursive depth can still reach V on a chain."
      },
      {
        "kind": "prose",
        "body": "Weights change the distance problem. Relax u→v by comparing the old distance with d[u]+weight. Dijkstra settles a minimum tentative distance using nonnegative edge weights; stale queue proposals may be skipped. Bellman–Ford revisits relaxations and can detect a reachable negative cycle. In a DAG, topological order permits one relaxation pass even with negative weights. Unreachable vertices keep an explicit unreachable state."
      },
      {
        "kind": "prose",
        "body": "When a route is required, retain predecessors responsible for discoveries or improvements. A distance value alone does not identify a path. Follow the predecessor chain backward and reverse it for forward order."
      }
    ]
  },
  {
    "id": "dsaa-learn-dependency-prefix",
    "title": "Track components, dependencies and prefixes",
    "summary": "Keep distinct graph and string invariants separate.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: DFS and topological ordering",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec10/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "Princeton: union-find study guide",
        "url": "https://algs4.cs.princeton.edu/15uf/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "Stanford CS106B: tries",
        "url": "https://web.stanford.edu/class/archive/cs/cs106b/cs106b.1188/lectures/Lecture21/Lecture21.pdf",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Kahn’s topological algorithm repeatedly removes in-degree-zero vertices and reduces their neighbors’ remaining in-degrees. Emitting fewer than V vertices exposes a directed cycle. A DAG may have several valid orders: unrelated prerequisites need not have a fixed relative position."
      },
      {
        "kind": "prose",
        "body": "Union-find instead tracks an undirected connectivity partition. Find returns a representative; union joins different representatives. An edge within one component closes a cycle in the processed undirected graph. Path compression shortens parent paths without changing membership. Combined with union by size or rank, it yields the inverse-Ackermann amortized bound. It does not store shortest routes or topological order."
      },
      {
        "kind": "prose",
        "body": "A trie shares prefixes among strings. The root-to-node path spells a prefix, while an end marker distinguishes a stored complete word. Deleting a word must preserve descendants needed by longer words. Under constant-time child lookup, one query of length L traverses O(L) edges. A set-style trie inserts a repeated word once; a multiset needs counts. Listing completions must also pay for the returned text."
      }
    ]
  },
  {
    "id": "dsaa-learn-choice-proof",
    "title": "Explore choices and justify greedy steps",
    "summary": "Distinguish exhaustive branching from a proved irreversible choice.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: recursive algorithms",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec15/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "Waterloo CS341: greedy algorithms",
        "url": "https://cs.uwaterloo.ca/~mdtpetri/cs341/CS341_Greedy_w26.pdf",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Backtracking chooses a value, explores descendants and restores the parent state before the next sibling. Copy a mutable path when emitting it. A size-k combination is complete at length k; increasing choices avoid permutations of the same selection. All subsets number 2 to the power n and all permutations number n factorial, so output work can be exponential. Prune only when every extension of the partial state is invalid. Memoization needs all information affecting future legal moves, not depth alone."
      },
      {
        "kind": "prose",
        "body": "A greedy algorithm commits to one locally selected choice. Feasibility is necessary but does not prove optimality. An exchange argument shows that some optimum can include the chosen step without becoming worse. For maximum-count nonempty interval scheduling, earliest finish preserves room for the remainder. Different rewards invalidate that count-based argument."
      },
      {
        "kind": "prose",
        "body": "Fractional knapsack permits exchanging small amounts of weight, supporting a value-density rule. Zero-one knapsack forbids splitting and needs another argument. Likewise, denominations 1,3,4 and amount 6 defeat largest-coin-first: 4+1+1 uses more coins than 3+3. Favorable samples do not replace a proof over the declared domain."
      }
    ]
  },
  {
    "id": "dsaa-learn-ordered-boundaries",
    "title": "Maintain interval and window boundaries",
    "summary": "Use ordering and monotone movement without changing caller data.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "Waterloo CS341: scheduling",
        "url": "https://cs.uwaterloo.ca/~mdtpetri/cs341/CS341_Greedy_w26.pdf",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MDN: Map",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Endpoint semantics are part of an interval contract. Half-open [start,end) excludes end, so touching nonempty meetings can reuse one room; process equal-time ends before starts in an occupancy sweep. Closed intervals sharing an endpoint intersect. After sorting by start, a merge extends its end by max, never shrinking for an interval contained inside it."
      },
      {
        "kind": "prose",
        "body": "For a fixed-size sum window, subtract the departing value and add the arriving one. Variable windows need an invariant and a monotonicity argument. Strictly positive values support familiar shortest-sum boundary moves; negative values can invalidate them. For at-most-k distinct values, maintain frequencies, shrink until the constraint holds, and delete keys reaching zero. Each forward-only boundary moves at most n times in total."
      },
      {
        "kind": "prose",
        "body": "Two pointers in ascending data can eliminate candidates by comparing the current sum with the target. If the task forbids mutation and positions are irrelevant, sort a numeric copy first. A different return contract requiring original positions needs to preserve those positions too."
      }
    ]
  },
  {
    "id": "dsaa-learn-dynamic-programming",
    "title": "Define states before writing recurrences",
    "summary": "Use dependencies, base cases and impossible states in one- and two-dimensional DP.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: recursive algorithms and DP",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec15/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: DP subproblems",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec16/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: subsets and pseudopolynomial time",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec18/",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A DP key must capture the entire remaining subproblem. Memoization computes each reachable key once; a presence check must distinguish a cached zero from absence. A recurrence groups valid final choices, while explicit base cases terminate dependencies. Coin minimum uses cost 0 at amount 0 and Infinity for impossible amounts; ways-to-climb uses ways(0)=1. A house-selection state must preserve the no-adjacent constraint."
      },
      {
        "kind": "prose",
        "body": "A grid-path state adds routes from above and left; blocked cells reset to zero. LCS over two prefixes extends a matching final pair or compares dropping one unmatched endpoint. Edit distance uses empty-prefix boundaries equal to the other prefix’s length under unit insertion/deletion costs. Zero-one knapsack compressed into one capacity array scans downward so the current item cannot feed itself repeatedly."
      },
      {
        "kind": "prose",
        "body": "Count states and transitions: n states with k work each take O(nk); a constant-work r-by-c table takes O(rc). Rolling storage can retain only needed prior rows or values, but reconstruction may require predecessors or recomputation. A final score and the choices producing it are different outputs."
      }
    ]
  },
  {
    "id": "dsaa-learn-bits-sorting",
    "title": "State the machine model and prove the sort",
    "summary": "Separate bit widths, ordering, preservation and stability.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MDN: bitwise XOR",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MDN: left shift",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: sorting",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec3/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MIT6.006: binary heaps",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec8/",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "JavaScript Number bitwise operations use 32-bit words. Shift counts use their low 5 bits; >>> fills with zeros while >> propagates the sign bit. XOR cancels equal bit patterns, recovering an unpaired value only under the stated multiplicities. For nonzero n, n&(n-1) clears its lowest set bit. The power-of-two check must separately exclude zero. A mask has 2 to the power n possible membership patterns, subject to the chosen word-width limit."
      },
      {
        "kind": "prose",
        "body": "Balanced merge sort does linear work at each logarithmic depth. Choosing the left record on equal keys preserves cross-half stability. Quicksort’s repeated 0-versus-(n-1) splits are quadratic; random pivots give an expectation, not a guarantee for every random sequence. Iterative in-place heap sort has logarithmic-height repairs and constant auxiliary state, but is not stable by default."
      },
      {
        "kind": "prose",
        "body": "A sorting proof must show both ordered output and preservation of all input values with multiplicity. Stability and nonmutation are additional promises when stated. The comparison lower bound distinguishes n-factorial orders with binary decisions; bounded-key counting sort uses extra key operations and a separate range parameter, so it does not contradict that model."
      }
    ]
  },
  {
    "id": "dsaa-learn-advanced-review",
    "title": "Choose a model and test its boundaries",
    "summary": "Connect representation, proof, cost and ownership before selecting a technique.",
    "estimatedMinutes": 15,
    "sources": [
      {
        "label": "MIT6.006: course review",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec20/",
        "reviewedOn": "2026-10-22"
      },
      {
        "label": "MDN: Object.freeze",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze",
        "reviewedOn": "2026-10-22"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Begin with the required output, valid input domain and constraints. Fewest hops, minimum weighted cost, component membership and a valid dependency order ask different questions even when they share a graph. Unit-cost paths suit BFS. A DAG permits topological relaxation with negative weights; an arbitrary negative-weight graph needs an appropriate different method."
      },
      {
        "kind": "prose",
        "body": "Write the state invariant and justify each discarded candidate. Cache keys must retain constraints such as remaining capacity. Greedy choices need an optimal-completion argument; backtracking needs valid pruning; DP needs complete states and ordered dependencies. Add predecessor decisions if the result must include a route rather than only a score."
      },
      {
        "kind": "prose",
        "body": "Count input work, output size K and auxiliary storage separately. Frozen ordinary fixtures expose writes that violate a no-mutation promise. Empty data, duplicates, ties, disconnected vertices, exact endpoints and unreachable states often distinguish a sample-only solution from one matching the stated contract. Bounded automated assertions provide evidence for those cases; they are not a general proof of every program’s complexity."
      }
    ]
  }
];
