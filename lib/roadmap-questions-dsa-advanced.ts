/** Original question wording in plan section12.3 order; sixteen source concepts moved from E3's preserved holding bank. */
import type { Seed } from './roadmap-build';
export const dsaAdvancedSeeds: Seed[] = [
  {
    "q": "In a min-heap holding many values, where does the smallest value sit?",
    "opts": [
      "At the root, above every other value",
      "In a leaf, because small values sink",
      "In the last slot of the backing array",
      "Wherever it was inserted, since heaps only reorder on demand"
    ],
    "a": 0,
    "e": "Every parent is no greater than either child, so following parents reaches a root no greater than any value. A leaf, the final array slot or the insertion position need not be minimum.",
    "intro": "Follow parent comparisons toward the root.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "What is the time complexity of finding (peeking at) the minimum in a min-heap?",
    "opts": [
      "O(log n)",
      "O(n)",
      "O(n log n)",
      "O(1)"
    ],
    "a": 3,
    "e": "Peeking reads the root without changing the heap, so its worst-case cost is O(1). Logarithmic work belongs to repair after insertion or extraction; neither a scan nor a sort is needed.",
    "intro": "Separate reading a value from repairing a structure.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "What is the worst-case time complexity of inserting one element into a binary heap of n elements?",
    "opts": [
      "O(n)",
      "O(n²)",
      "O(log n)",
      "O(1)"
    ],
    "a": 2,
    "e": "Append at the next free position, then exchange with parents while needed. At most the heap height is crossed, giving O(log n) worst-case time. Constant time describes only cases needing no upward movement; linear and quadratic bounds are not tight.",
    "intro": "Count how many parent links the new value can cross.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "Removing the minimum (extract-min) from a binary heap of n elements costs, in the worst case:",
    "opts": [
      "O(n log n)",
      "O(log n)",
      "O(1)",
      "O(n)"
    ],
    "a": 1,
    "e": "Move the last value into the root and sift down, comparing children to choose the smaller one. At most O(log n) levels are traversed. Constant-time peek does not remove anything; scanning or sorting the whole heap is unnecessary.",
    "intro": "Count how many levels a replacement root can descend.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "A binary heap is most commonly implemented using:",
    "opts": [
      "An array indexed level by level",
      "A binary tree of linked nodes",
      "A hash map from index to value",
      "A linked list in level order"
    ],
    "a": 0,
    "e": "A complete binary tree fits an array in level order without holes. Zero-based children of i are 2i+1 and 2i+2. Linked structures can represent a heap but are not its usual compact representation.",
    "intro": "Use the complete-tree shape to compute child locations.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "A priority queue must repeatedly insert values and remove the highest-priority one. Which structure keeps both operations efficient as n grows?",
    "opts": [
      "A plain array",
      "A hash table",
      "A singly linked list",
      "A heap"
    ],
    "a": 3,
    "e": "A binary heap supports O(log n) worst-case insertion and root removal. An unsorted array makes minimum removal linear; a sorted array makes insertion linear. A plain FIFO queue does not implement arbitrary priorities.",
    "intro": "Compare the costs of both required operations.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "Building a heap from an unsorted array of n elements (heapify) can be done in:",
    "opts": [
      "O(n log n)",
      "O(n squared)",
      "O(n)",
      "O(log n)"
    ],
    "a": 2,
    "e": "Bottom-up heap construction sifts internal nodes downward. Most nodes are near the leaves and need little work; summing heights gives O(n). Inserting all n elements separately has an O(n log n) worst-case bound instead.",
    "intro": "Sum repair heights rather than charging every node the maximum height.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "Heap sort works by building a heap and repeatedly extracting the root; its overall time complexity is:",
    "opts": [
      "O(log n)",
      "O(n log n)",
      "O(n)",
      "O(n²)"
    ],
    "a": 1,
    "e": "Building costs O(n), then n root removals cost O(log n) each in the worst case, giving O(n log n) overall. The linear build does not make the removals linear; quadratic work is unnecessary.",
    "intro": "Account for construction and the full sequence of removals.",
    "tags": [
      "DSA Advanced",
      "1"
    ]
  },
  {
    "q": "A graph is composed of:",
    "opts": [
      "Vertices and the edges connecting them",
      "Vertices that must all be connected",
      "A single root and its descendants",
      "A square matrix of connection flags"
    ],
    "a": 0,
    "e": "Vertices connected by edges model entities and relationships. Values, priorities or array indices may label them but do not replace the vertex/edge structure.",
    "intro": "Identify the entities and their relationships.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "In a directed graph, an edge:",
    "opts": [
      "may be followed from either endpoint",
      "always comes with a matching reverse edge",
      "carries a weight in addition to a direction",
      "runs one way, from a source to a target"
    ],
    "a": 3,
    "e": "A directed edge has an ordered source and destination. It permits traversal in that direction; a reverse edge is a separate relationship. Neither equality nor an undirected connection captures that order.",
    "intro": "An arrow has a source and a destination.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "An adjacency matrix representation of a graph with V vertices uses how much space?",
    "opts": [
      "O(V)",
      "O(V + E)",
      "O(E)",
      "O(V²)"
    ],
    "a": 3,
    "e": "A V-by-V adjacency matrix reserves one cell for each ordered vertex pair, so space is O(V squared), even when few edges exist. Adjacency lists instead need O(V+E); the number of actual edges does not shrink the fixed matrix.",
    "intro": "Count matrix cells, including pairs without edges.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "An undirected simple graph has 6 vertices and 4 edges. How many neighbor entries do ordinary adjacency lists store?",
    "opts": [
      "8",
      "4",
      "6",
      "24"
    ],
    "a": 0,
    "e": "Each undirected edge appears once at each endpoint, giving 2E=8 entries. Four counts edges once; six counts vertices; 24 multiplies unrelated quantities.",
    "intro": "Count both endpoints of each undirected edge.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "A sparse graph has one million vertices but few edges per vertex. Which representation avoids reserving every possible vertex pair?",
    "opts": [
      "A full adjacency matrix",
      "A sorted V-by-V matrix",
      "A dense matrix with zero in absent cells",
      "Adjacency lists"
    ],
    "a": 3,
    "e": "Lists allocate vertex records plus actual neighbor entries. Each matrix alternative still reserves V squared cells regardless of how many are zero.",
    "intro": "Compare allocated cells with actual relationships.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "In a simple adjacency-list graph, what must the representation include to preserve an isolated vertex?",
    "opts": [
      "An edge to the first vertex",
      "No entry because it has no edges",
      "A vertex entry with an empty neighbor list",
      "An invented self-loop"
    ],
    "a": 2,
    "e": "An isolated vertex exists despite having degree zero. Its empty list preserves membership; invented edges change the graph, and omitting it loses a vertex.",
    "intro": "Membership and number of neighbors are different facts.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "A directed graph has A→B and A→C. What are A’s out-degree and in-degree?",
    "opts": [
      "1 and 1",
      "2 and 0",
      "0 and 2",
      "2 and 2"
    ],
    "a": 1,
    "e": "Out-degree counts edges leaving A, so it is two. No listed edge enters A. Reversing or double-counting edges gives the distractors.",
    "intro": "Read the direction of each incident arrow.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "An adjacency matrix is already allocated. How much indexed work checks whether edge u→v exists?",
    "opts": [
      "O(1)",
      "O(V)",
      "O(E)",
      "O(V+E)"
    ],
    "a": 0,
    "e": "One cell at row u and column v answers the query. A row scan, edge scan or graph traversal is unnecessary. Allocation remains quadratic; this question asks only lookup.",
    "intro": "Distinguish representation space from one lookup.",
    "tags": [
      "DSA Advanced",
      "2"
    ]
  },
  {
    "q": "Using adjacency lists, what is the time complexity of breadth-first search over an entire graph (starting a new search at every unvisited vertex) with V vertices and E edges?",
    "opts": [
      "O(E)",
      "O(V × E)",
      "O(V + E)",
      "O(V)"
    ],
    "a": 2,
    "e": "With adjacency lists and O(1) visited checks, a full BFS forest initializes V vertices and scans E edges, for O(V+E) work. A single source reaches only its component; the stated full bound includes all vertices.",
    "intro": "Count vertex processing and adjacency-list entries separately.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "Using adjacency lists, what is the time complexity of depth-first search over an entire graph (starting a new search at every unvisited vertex) with V vertices and E edges?",
    "opts": [
      "O(log V)",
      "O(V + E)",
      "O(V²)",
      "O(E²)"
    ],
    "a": 1,
    "e": "A full DFS forest marks each vertex once and scans each adjacency-list entry once, giving O(V+E) under constant-time visited checks. Recursive depth can still be O(V); edge scanning is not a V-by-V matrix scan.",
    "intro": "Separate stack depth from total graph traversal work.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "Which data structure does BFS use to manage which vertex to visit next?",
    "opts": [
      "A queue",
      "A stack",
      "A heap",
      "A binary search tree"
    ],
    "a": 0,
    "e": "BFS uses a FIFO queue so all vertices at one edge distance are processed before the next distance. A stack gives depth-first exploration; a priority queue orders by priority, and a set alone supplies no FIFO order.",
    "intro": "Which pending vertex must leave first to preserve layers?",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "BFS starts at S in an unweighted graph. When should a newly discovered vertex be marked visited to prevent duplicate queue entries?",
    "opts": [
      "Only after all neighbors finish",
      "Only when the queue becomes empty",
      "Whenever a shorter weighted path appears",
      "When it is enqueued"
    ],
    "a": 3,
    "e": "Marking on enqueue lets later discoveries see the vertex is already pending. Waiting can enqueue it many times. Weighted relaxation describes a different shortest-path setting.",
    "intro": "A pending vertex is already discovered.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "Why does ordinary BFS find a shortest path by number of edges in an unweighted graph?",
    "opts": [
      "Its recursion explores every path first",
      "It sorts all edges by weight",
      "FIFO processing visits distance layers in order",
      "It always chooses the smallest vertex label"
    ],
    "a": 2,
    "e": "All distance-d vertices leave the queue before distance-(d+1) vertices. Labels are irrelevant, exhaustive paths are unnecessary, and this graph has no varying weights to sort.",
    "intro": "Track the distances of queued vertices.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "DFS uses white/unvisited, gray/active and black/finished vertices. In a directed graph, which edge demonstrates a cycle?",
    "opts": [
      "Every edge leaving the start vertex",
      "An edge to a gray ancestor",
      "Any edge to a black vertex",
      "Any edge to an unvisited vertex"
    ],
    "a": 1,
    "e": "A gray ancestor remains on the current DFS path, so the edge closes a directed cycle. A black target can be a valid cross/forward edge; first discoveries and root edges alone do not prove a cycle.",
    "intro": "Ask whether the target is still on the current path.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "A chain contains n vertices. What is the worst-case pending-call depth of recursive DFS on it?",
    "opts": [
      "O(n)",
      "O(1)",
      "O(log n)",
      "O(n squared)"
    ],
    "a": 0,
    "e": "DFS can recurse to the end before returning, leaving one call per vertex. Constant or logarithmic depth requires a different shape or iterative storage; quadratic depth exceeds the chain length.",
    "intro": "Trace calls before the first return.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "BFS records parent[v]=u when v is first discovered. How can it reconstruct one source-to-v path?",
    "opts": [
      "Sort visited labels",
      "Read the queue after traversal",
      "Follow arbitrary outgoing edges from v",
      "Follow parents back to the source, then reverse"
    ],
    "a": 3,
    "e": "Discovery parents form paths back to the source. Reversing that chain gives forward order. Label order, the drained queue and arbitrary edges do not preserve the chosen predecessor chain.",
    "intro": "A predecessor points backward along the discovered path.",
    "tags": [
      "DSA Advanced",
      "3"
    ]
  },
  {
    "q": "Under its nonnegative edge-weight assumption, what does Dijkstra’s algorithm compute?",
    "opts": [
      "an ordering of vertices that respects every dependency",
      "the groups of vertices that can all reach each other",
      "shortest paths from one source, given non-negative weights",
      "the cheapest set of edges connecting every vertex"
    ],
    "a": 2,
    "e": "Dijkstra computes single-source shortest-path distances when edge weights are nonnegative. It does not produce a topological order or a spanning-tree optimum, and negative edges invalidate its usual settled-distance proof.",
    "intro": "Recall the edge-weight condition behind a settled minimum distance.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "A directed graph has S→A of weight 8, S→B of weight 2 and B→A of weight 1. What is the shortest distance S to A?",
    "opts": [
      "2",
      "11",
      "3",
      "8"
    ],
    "a": 2,
    "e": "The route through B costs 2+1=3, less than the direct edge’s 8. Two reaches only B; 11 adds edges that are not the selected route.",
    "intro": "Compare complete route costs, not individual edges.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "Relaxing u→v with weight w means which update?",
    "opts": [
      "Mark every vertex reachable from v as final",
      "Set d[v] to min(d[v],d[u]+w)",
      "Always replace d[v] with w",
      "Always replace d[u] with d[v]+w"
    ],
    "a": 1,
    "e": "Relaxation compares the current distance with a route extending through u. The edge weight alone omits the source-to-u cost, reversing endpoints solves another relation, and finality needs an algorithm-specific proof.",
    "intro": "Extend the best known route to u by one edge.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "Why can ordinary Dijkstra settle the smallest tentative distance with nonnegative edges?",
    "opts": [
      "An unfinished detour cannot lower it through a negative edge",
      "Every edge has the same weight",
      "Every shortest path visits all vertices",
      "The graph must be acyclic"
    ],
    "a": 0,
    "e": "Nonnegative extensions cannot make a longer unfinished prefix improve an already minimum unsettled distance. Equal weights are sufficient for BFS but unnecessary here; cycles and unused vertices are allowed.",
    "intro": "Consider what adding a nonnegative edge can do to cost.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "Which condition makes BFS a valid shortest-path replacement for Dijkstra?",
    "opts": [
      "Every vertex has a unique label",
      "All weights are merely nonnegative",
      "The graph is directed",
      "Every edge has the same positive cost"
    ],
    "a": 3,
    "e": "Equal positive costs make minimizing cost equivalent to minimizing edge count. Varying nonnegative weights can defeat BFS; labels and direction do not establish cost layers.",
    "intro": "When does edge count determine total cost?",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "A vertex is unreachable from the source. What should its shortest-path distance remain under the usual initialization?",
    "opts": [
      "The largest finite edge weight",
      "The number of vertices",
      "Infinity",
      "Zero"
    ],
    "a": 2,
    "e": "No finite route has been established, so Infinity remains. Zero is the source’s distance; an edge maximum or vertex count invents a route cost.",
    "intro": "Do not replace absence of a route with an arbitrary finite number.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "A lazy priority-queue implementation of Dijkstra may hold old distances for a vertex. What should it do when popping an entry larger than the current d[v]?",
    "opts": [
      "Declare a negative cycle",
      "Skip that stale entry",
      "Replace d[v] with the larger value",
      "Clear all other queued entries"
    ],
    "a": 1,
    "e": "A later relaxation already found something better, making the old entry obsolete. Raising the distance loses progress; clearing unrelated work or reporting a cycle has no basis.",
    "intro": "Compare the queued proposal with the best current proposal.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "Which algorithm can handle negative edges and detect a reachable negative cycle in a general directed graph?",
    "opts": [
      "Bellman–Ford",
      "Ordinary Dijkstra",
      "Unweighted BFS",
      "A single alphabetical vertex scan"
    ],
    "a": 0,
    "e": "Bellman–Ford repeatedly relaxes edges and checks for further reachable improvement. Ordinary Dijkstra assumes nonnegative weights; BFS assumes equal costs. Label order supplies no path-cost guarantee.",
    "intro": "The algorithm must revisit improvements rather than settle greedily.",
    "tags": [
      "DSA Advanced",
      "4"
    ]
  },
  {
    "q": "A topological sort can be performed on which kind of graph?",
    "opts": [
      "An undirected graph with no cycles",
      "A directed graph with no cycles",
      "Any graph, directed or not",
      "Any directed graph, cycles included"
    ],
    "a": 1,
    "e": "A directed acyclic graph admits an ordering with each edge pointing forward. A directed cycle would require a vertex both before and after itself. An undirected graph or arbitrary cyclic digraph does not satisfy this contract.",
    "intro": "Translate each directed edge into a before/after constraint.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "Kahn’s topological-sort algorithm begins with which vertices?",
    "opts": [
      "Vertices with out-degree zero only",
      "The highest-weight vertices",
      "Only vertices reachable from a chosen source",
      "Vertices with in-degree zero"
    ],
    "a": 3,
    "e": "An in-degree-zero vertex has no remaining prerequisite. Removing it can expose new zero-in-degree vertices. Sinks, weights and a single-source restriction do not implement the prerequisite ordering.",
    "intro": "Choose work with no unfinished prerequisite.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "Kahn’s algorithm emits fewer than V vertices after its queue empties. What follows?",
    "opts": [
      "The ordering is complete anyway",
      "All remaining vertices have degree zero",
      "The directed graph contains a cycle",
      "The graph is necessarily disconnected"
    ],
    "a": 2,
    "e": "A nonempty remainder with no zero-in-degree vertex contains a directed cycle. Disconnected DAG components would each still supply eligible roots. Fewer than V emitted vertices is incomplete.",
    "intro": "Consider why every remaining vertex still has a predecessor.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "A DAG has A→C and B→C. Which is a valid topological order?",
    "opts": [
      "C,B,A",
      "B,A,C",
      "C,A,B",
      "A,C,B"
    ],
    "a": 1,
    "e": "Both A and B must precede C, but their mutual order is unconstrained. Each other candidate puts C before at least one prerequisite.",
    "intro": "Check every edge, rather than expecting a unique order.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "What question does disjoint-set union answer directly?",
    "opts": [
      "Whether two elements belong to the same component",
      "The shortest path between two elements",
      "The order of all vertices in a DAG",
      "The minimum edge in each outgoing list"
    ],
    "a": 0,
    "e": "Find compares component representatives, and union merges components. It does not retain the route, dependency order or edge-priority information needed by the other queries.",
    "intro": "Separate component membership from graph path details.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "Union-find uses path compression. What changes during find(x)?",
    "opts": [
      "All components merge into one",
      "Element labels are sorted",
      "The representative is deleted",
      "Traversed parent pointers move toward the representative"
    ],
    "a": 3,
    "e": "Path compression shortens future representative searches without merging different sets. Sorting labels or deleting roots is unrelated and can destroy the representation.",
    "intro": "The membership partition stays the same while the route gets shorter.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "While processing an undirected simple graph, an edge joins vertices already in the same union-find component. What does it establish?",
    "opts": [
      "That the edge has minimum weight",
      "That all vertices are connected",
      "That adding this edge closes a cycle",
      "That the graph is a DAG"
    ],
    "a": 2,
    "e": "An existing path already links the endpoints, so the new edge closes a cycle. This says nothing about weight or global connectivity, and DAG is a directed-graph concept.",
    "intro": "Compare the new edge with the existing component path.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "With path compression and union by size, what is the usual amortized bound per union/find operation?",
    "opts": [
      "Exactly one pointer access always",
      "O(alpha(n)), nearly constant",
      "O(n) for every operation",
      "O(n log n) per operation"
    ],
    "a": 1,
    "e": "The inverse-Ackermann amortized bound applies across a sequence with both heuristics. It is not a claim that every call touches one pointer; the larger alternatives miss the sequence bound.",
    "intro": "An amortized bound permits some individual operations to cost more.",
    "tags": [
      "DSA Advanced",
      "5"
    ]
  },
  {
    "q": "A trie stores lowercase words. What does one root-to-node edge sequence represent?",
    "opts": [
      "A prefix of stored words",
      "The insertion time of a word",
      "A hash collision chain",
      "A numeric heap path"
    ],
    "a": 0,
    "e": "Each edge consumes one character, so the path spells a prefix. Time order, hash collisions and heap priority do not determine trie paths.",
    "intro": "Read edge labels in order from the root.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "A trie contains only 'stone'. Why must exact lookup for 'sto' fail even though its path exists?",
    "opts": [
      "All prefixes are stored as complete words",
      "Exact lookup must visit every node",
      "Tries cannot store strings of unequal length",
      "Its final node lacks an end-of-word marker"
    ],
    "a": 3,
    "e": "Path existence proves a prefix, while the terminal marker proves a complete stored word. Scanning all nodes is unnecessary, and unequal word lengths are supported.",
    "intro": "Separate reaching a node from ending a stored word.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "With expected constant-time child lookup, searching a word of length L in a trie costs what in the worst case?",
    "opts": [
      "O(L squared)",
      "O(1) regardless of L",
      "O(L)",
      "O(number of stored words)"
    ],
    "a": 2,
    "e": "Search consumes at most one character per edge and may need all L. The number of words is not a scan factor; quadratic work is unnecessary, and reading an arbitrary query is not constant.",
    "intro": "Count characters consumed along one path.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "A trie stores 'car' and 'cart'. When deleting 'car', what must be preserved?",
    "opts": [
      "A duplicate copy of every prefix",
      "The path needed by 'cart'",
      "No node reachable from 'car'",
      "Only the root node"
    ],
    "a": 1,
    "e": "Clear car’s terminal marker and prune only nodes unused by another word. Removing the shared path loses cart; duplicating prefixes defeats the shared representation.",
    "intro": "One word may be another word’s prefix.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "What does a trie prefix query for 're' need before enumerating completions?",
    "opts": [
      "Find the node reached after 'r' then 'e'",
      "Sort every stored word first",
      "Remove every word without that prefix",
      "Compare only word lengths"
    ],
    "a": 0,
    "e": "The prefix path identifies the relevant subtree. Enumeration explores its marked descendants; global sorting, deletion or lengths alone do not locate it.",
    "intro": "Find the shared path before listing descendants.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "What bounds the number of non-root nodes when building a plain trie from words with total character count C?",
    "opts": [
      "Exactly the number of words",
      "At least C squared",
      "Always 26 nodes",
      "At most C"
    ],
    "a": 3,
    "e": "Every inserted character can create at most one node, while shared prefixes reduce that total. Word count ignores length; quadratic and fixed totals have no such bound.",
    "intro": "Charge a new node to the character that creates it.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "A prefix search returns K words containing T characters altogether. Why can its total time not generally ignore T?",
    "opts": [
      "The root must be rebuilt for every result",
      "Every trie lookup requires sorting",
      "Writing the returned words costs at least proportional output work",
      "Child lookup must be linear in all words"
    ],
    "a": 2,
    "e": "Even efficient traversal must materialize the requested output. That output lower bound does not imply global scans, rebuilding or sorting for lookup.",
    "intro": "Account for the result as well as finding its starting node.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "A word is inserted twice into a set-style trie, then removed once. Under set semantics, what remains?",
    "opts": [
      "All words sharing its first letter disappear",
      "The word is absent",
      "One counted copy must remain",
      "The whole trie is empty"
    ],
    "a": 1,
    "e": "Set insertion is idempotent, so there was one membership to remove. A multiset would need explicit counts; unrelated words and prefixes stay intact.",
    "intro": "State whether repeated insertion counts multiplicity.",
    "tags": [
      "DSA Advanced",
      "6"
    ]
  },
  {
    "q": "Backtracking explores combinations by choosing, recursing and undoing. Why undo the choice before exploring its sibling?",
    "opts": [
      "To restore the parent state for the next branch",
      "To sort all answers automatically",
      "To make recursion constant-space",
      "To skip every failing branch without checking it"
    ],
    "a": 0,
    "e": "Sibling branches must begin with the same parent state. Undoing prevents earlier choices from leaking; it neither sorts output nor proves constant space or automatic pruning.",
    "intro": "A sibling must not inherit the prior sibling’s local choice.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "An algorithm emits all subsets of n distinct elements. How many subsets exist, including the empty subset?",
    "opts": [
      "n squared",
      "n factorial",
      "2n",
      "2 to the power n"
    ],
    "a": 3,
    "e": "Each element is independently included or excluded, giving two choices per element. Permutations count order, while linear or quadratic counts omit most subsets.",
    "intro": "Count independent yes/no choices.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "Why must an emitted array often be copied from a mutable backtracking path?",
    "opts": [
      "Arrays cannot be stored inside arrays",
      "Copying sorts duplicate choices",
      "Later push/pop operations would otherwise change the stored answer",
      "Copies make exponential output linear"
    ],
    "a": 2,
    "e": "Storing the same mutable path reference lets later edits alter every recorded answer. Copying preserves that moment’s path; it does not change output count or sort it.",
    "intro": "Distinguish a snapshot from a reference to ongoing work.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "A candidate partial assignment already violates a constraint that adding choices cannot repair. What is valid pruning?",
    "opts": [
      "Remove the constraint from the problem",
      "Stop exploring that branch",
      "Stop every branch in the search",
      "Accept the partial assignment"
    ],
    "a": 1,
    "e": "No extension can restore validity, so descendants are useless. That proof is local to the branch; accepting it or changing the problem is incorrect.",
    "intro": "Pruning needs an argument about every extension of this state.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "To generate permutations of distinct items, why track which positions are already used?",
    "opts": [
      "Each position may appear once in a permutation",
      "Equal values must be deleted from input",
      "The final order must always be sorted",
      "It makes each permutation contain fewer than n items"
    ],
    "a": 0,
    "e": "The used set prevents selecting a position twice while allowing other positions. This differs from sorting, deleting values or shortening complete permutations.",
    "intro": "A permutation reorders all positions without reusing one.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "What is a suitable stopping condition for a length-k combination search?",
    "opts": [
      "The first branch fails",
      "The input happens to be sorted",
      "The recursion depth exceeds the input by one",
      "The current path contains k selected items"
    ],
    "a": 3,
    "e": "A size-k path is a complete result and must be copied before backtracking. A failed branch or sorted input does not define completion; excessive depth is already too late.",
    "intro": "Tie completion to the requested output shape.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "A backtracking search memoizes only by depth, although future legal moves also depend on a used-item set. What can go wrong?",
    "opts": [
      "The algorithm becomes automatically iterative",
      "Every result is counted twice",
      "Different states at the same depth are incorrectly merged",
      "The cache always becomes larger than the search tree"
    ],
    "a": 2,
    "e": "Depth alone does not determine which items remain available. Reusing one state’s result for another can lose or invent answers; no fixed direction of counting error or control-flow change follows.",
    "intro": "A cache key must capture all state affecting future choices.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "Can an algorithm listing all permutations of n distinct items generally run in polynomial total time?",
    "opts": [
      "No, because sorting always takes exponential time",
      "No, the output itself has n factorial permutations",
      "Yes, if it uses one loop",
      "Yes, if recursion is replaced by a stack"
    ],
    "a": 1,
    "e": "Materializing n-factorial outputs already exceeds any fixed polynomial for growing n. Loop syntax or an explicit stack cannot remove output work; sorting is not exponential.",
    "intro": "Lower-bound the required work by the size of the output.",
    "tags": [
      "DSA Advanced",
      "7"
    ]
  },
  {
    "q": "For maximum-cardinality scheduling of nonempty half-open intervals on one resource, which greedy first choice is justified?",
    "opts": [
      "The compatible interval finishing earliest",
      "The interval starting earliest",
      "The longest interval",
      "The interval with the highest id"
    ],
    "a": 0,
    "e": "An exchange argument can replace an optimal solution’s first interval with the earliest-finishing one without reducing room for later work. Earliest start or longest duration can block more intervals; ids are irrelevant.",
    "intro": "Choose what leaves the most room after it finishes.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "What does an exchange argument establish for a greedy choice?",
    "opts": [
      "Every local minimum is globally optimal",
      "All input orders produce identical intermediate states",
      "No counterexample needs consideration",
      "Some optimum can be changed to include the choice without getting worse"
    ],
    "a": 3,
    "e": "The transformation connects the local choice to an optimum while preserving feasibility and value. It is not a blanket guarantee for all local rules or all states.",
    "intro": "Bridge the chosen local action to an optimal complete solution.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "Coin denominations are 1,3,4 and the target is 6. What defeats repeatedly taking the largest affordable coin?",
    "opts": [
      "The optimal solution uses six coins",
      "All coin systems make greedy optimal",
      "Greedy gives 4+1+1 while 3+3 uses fewer coins",
      "Greedy cannot make 6 at all"
    ],
    "a": 2,
    "e": "This explicit counterexample has three greedy coins versus two optimal coins. It disproves a general greedy guarantee without claiming the target is unreachable.",
    "intro": "Compare the chosen decomposition with one complete alternative.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "In a fractional-knapsack problem with positive item weights, items can be split freely. Which rule maximizes value under a weight cap?",
    "opts": [
      "Always take the heaviest item first",
      "Take decreasing value per unit weight",
      "Take increasing absolute value",
      "Take increasing item label"
    ],
    "a": 1,
    "e": "When splitting is allowed, exchanging lower-density weight for higher-density weight improves value. Absolute value, labels or weight alone ignore the value gained per capacity unit.",
    "intro": "Use the divisible amount as the unit of exchange.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "Why does the same density rule not generally solve zero-one knapsack?",
    "opts": [
      "Items cannot be split, so a local choice can block a better combination",
      "All zero-one items have equal weight",
      "Sorting is forbidden",
      "Its optimum must contain every item"
    ],
    "a": 0,
    "e": "Indivisibility prevents the fractional exchange and can leave unused capacity or exclude a better bundle. Equal weights and forbidden sorting are not assumptions, and capacity can forbid taking all items.",
    "intro": "Which operation in the fractional proof is no longer legal?",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "An engineer proposes a new greedy rule because it worked on five examples. What is still needed for a general correctness claim?",
    "opts": [
      "More favorable examples alone",
      "A faster language runtime",
      "A sorted debug printout",
      "A proof or an explicit restricted domain where the rule is valid"
    ],
    "a": 3,
    "e": "Examples can disprove a rule but do not cover all valid inputs. Correctness needs an argument over the stated domain; runtime choice and presentation do not provide it.",
    "intro": "Evidence on selected inputs is different from a universal argument.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "Selecting earliest-finishing intervals is optimal for count. If each interval has a different reward, what changes?",
    "opts": [
      "Sorting becomes impossible",
      "Every optimal schedule uses one interval",
      "The count-based exchange may not preserve total reward",
      "The same proof works unchanged"
    ],
    "a": 2,
    "e": "Replacing one interval can sacrifice reward even when it preserves room. Weighted scheduling needs a suitable different argument, commonly dynamic programming; sorting and multi-interval solutions remain possible.",
    "intro": "Check whether the objective preserved by the proof changed.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "A greedy algorithm maintains a feasible partial answer. What must also be shown to prove optimality?",
    "opts": [
      "Its first answer matches a sample",
      "Its choices preserve the possibility of an optimal completion",
      "Its variable names describe the goal",
      "It allocates no arrays"
    ],
    "a": 1,
    "e": "Feasibility only excludes invalid answers. Optimality needs an argument that no better valid answer was ruled out; names, space use and one sample are not that argument.",
    "intro": "Being allowed and being best are different claims.",
    "tags": [
      "DSA Advanced",
      "8"
    ]
  },
  {
    "q": "Under half-open interval semantics [start,end), do [1,3) and [3,5) overlap?",
    "opts": [
      "No",
      "Yes at time 3",
      "Only when sorted",
      "Only when their lengths match"
    ],
    "a": 0,
    "e": "The first interval excludes 3 and the second includes it, so their occupied sets do not intersect. Ordering and lengths do not change that endpoint convention.",
    "intro": "Apply the stated endpoint inclusion rule.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "When merging closed intervals sorted by start, which condition joins the next interval to the current one?",
    "opts": [
      "next.start > current.end",
      "next.end < current.start",
      "Their lengths are equal",
      "next.start <= current.end"
    ],
    "a": 3,
    "e": "Closed intervals sharing an endpoint intersect, so equality merges too. A greater start leaves a gap; reversed endpoints and equal lengths do not decide overlap.",
    "intro": "Closed endpoints count as shared points.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "After merging an overlapping interval into the current one, how should its end change?",
    "opts": [
      "Always current.end",
      "current.end + next.end",
      "max(current.end,next.end)",
      "Always next.end"
    ],
    "a": 2,
    "e": "The merged interval must cover both extents. A contained next interval must not shrink the end; ignoring extensions loses coverage and adding endpoints invents it.",
    "intro": "An inner interval cannot shorten the union.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "Why sort intervals by start before a one-pass merge?",
    "opts": [
      "It proves every interval has positive length",
      "Potentially overlapping intervals become consecutive",
      "It makes all intervals disjoint",
      "It removes duplicate endpoint values"
    ],
    "a": 1,
    "e": "After sorting, a later gap means no even later start can reconnect to the earlier interval. Sorting changes order, not the intervals’ intersection, values or validity.",
    "intro": "Use monotone starts to know when a group is finished.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "How many rooms are needed for nonempty half-open meetings [0,4), [1,3), [3,5)?",
    "opts": [
      "2",
      "1",
      "3",
      "4"
    ],
    "a": 0,
    "e": "The first overlaps each of the others, but the second ends exactly when the third starts. Peak simultaneous occupancy is two, so one is insufficient and three is unnecessary.",
    "intro": "Track active meetings across the shared endpoint.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "In a sweep over half-open nonempty intervals, how should equal-time ends and starts be handled when counting rooms?",
    "opts": [
      "Process starts before ends",
      "Ignore all equal-time events",
      "Always add an extra room",
      "Process ends before starts"
    ],
    "a": 3,
    "e": "An end releases capacity before the next start uses it at the same instant. Starts first falsely treats touching intervals as overlapping; ignoring events loses occupancy changes.",
    "intro": "Reuse a room released at the same timestamp.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "Two intervals have identical starts but ends 4 and 9. Their union ends where?",
    "opts": [
      "13",
      "At the shared start",
      "9",
      "4"
    ],
    "a": 2,
    "e": "The union covers through the larger end. Keeping the smaller loses coverage, summing double-counts coordinates, and the start is not the far boundary.",
    "intro": "Endpoints are coordinates, not durations to sum.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "A merge returns fresh output intervals and promises not to mutate input. Which test checks a relevant boundary?",
    "opts": [
      "Sort the input before every assertion",
      "Pass frozen input and nested pairs, then verify the union",
      "Check only output length on one sample",
      "Verify the function name contains 'merge'"
    ],
    "a": 1,
    "e": "Frozen outer and inner arrays catch common in-place sorting or endpoint writes while the result checks behavior. A length-only sample, naming or pre-sorting can hide mutation bugs.",
    "intro": "Test the promised ownership behavior as well as the mathematical result.",
    "tags": [
      "DSA Advanced",
      "9"
    ]
  },
  {
    "q": "A fixed-length window sum slides right by one position. How can it update in constant arithmetic work?",
    "opts": [
      "Subtract the outgoing value and add the incoming value",
      "Sum every value in the window again",
      "Sort the window at every step",
      "Keep the first window’s sum forever"
    ],
    "a": 0,
    "e": "Adjacent fixed windows differ by exactly those two values. Resumming or sorting does extra work; keeping the old sum ignores the change.",
    "intro": "Compare the two adjacent windows’ membership.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "A variable window seeks the shortest sum-at-least-target interval in strictly positive numbers. Why may its left end advance when the target is met?",
    "opts": [
      "Every array is already sorted",
      "The smallest value is always at the left",
      "Negative values cancel automatically",
      "Removing a positive value cannot increase the sum"
    ],
    "a": 3,
    "e": "Positivity makes expansion nondecreasing and contraction nonincreasing, enabling a monotone boundary argument. Sorted order is unnecessary; arbitrary negative values break this reasoning.",
    "intro": "Identify the input assumption behind monotonicity.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "Why can the same positive-sum sliding-window proof fail with negative numbers?",
    "opts": [
      "Addition stops being associative for integers",
      "All shortest windows then have length one",
      "Removing an element may increase the sum",
      "A window cannot contain a negative number"
    ],
    "a": 2,
    "e": "Removing a negative value raises the sum, invalidating the earlier monotone decision rule. Negative elements are legal data under a changed domain, and no length-one conclusion follows.",
    "intro": "Try shrinking across a negative leftmost value.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "Two pointers search for a target sum in an ascending numeric array. If the current sum is too small, which move is justified?",
    "opts": [
      "Return failure immediately",
      "Advance the left pointer",
      "Decrease the right pointer",
      "Move both pointers past all values"
    ],
    "a": 1,
    "e": "Raising the smaller endpoint may raise the sum; decreasing the right endpoint can only keep it too small. Skipping both can lose a pair, and unexamined candidates may still work.",
    "intro": "Use sorted order to eliminate an entire set of candidates.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "A longest-substring-without-repeats window uses character counts. What must it do after adding a duplicate character?",
    "opts": [
      "Advance the left boundary until that character’s count is one",
      "Always restart after the right boundary",
      "Remove every occurrence from the input string",
      "Ignore the duplicate"
    ],
    "a": 0,
    "e": "Restoring the unique-window invariant may require several removals. Restarting discards valid candidates, mutating the source changes the problem, and ignoring the repeat keeps an invalid window.",
    "intro": "Restore the invariant before measuring the window.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "In a usual one-pass sliding-window scan, each pointer moves only forward at most n times. What bounds total pointer moves?",
    "opts": [
      "O(n squared) automatically",
      "O(log n)",
      "O(1)",
      "O(n)"
    ],
    "a": 3,
    "e": "The nested-looking contraction loop shares a global monotone left pointer, so across all expansions it advances at most n times. It does not restart n times, and reading n values is not constant or logarithmic.",
    "intro": "Charge each left move to an element removed once.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "A window count map decrements the outgoing value’s count to zero. If map.size means distinct values in the window, what must happen?",
    "opts": [
      "Increment every other key",
      "Clear the whole map",
      "Delete that key",
      "Keep the zero entry forever"
    ],
    "a": 2,
    "e": "Zero-count entries are no longer window members and would inflate map.size. Other counts remain valid; clearing everything loses their state.",
    "intro": "Make the stored keys match the quantity being counted.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "A two-pointer method assumes sorted input, but the task forbids mutation and the input is unsorted. What is a valid preparation when original positions are irrelevant?",
    "opts": [
      "Drop values that look out of order",
      "Sort a copy numerically",
      "Sort the original in place",
      "Assume the input is already sorted"
    ],
    "a": 1,
    "e": "A numeric sorted copy supplies the monotonicity without changing caller data. Mutating violates ownership; assuming order or dropping values changes the domain/problem.",
    "intro": "Preserve the original data while establishing the required invariant.",
    "tags": [
      "DSA Advanced",
      "10"
    ]
  },
  {
    "q": "What makes a dynamic-programming state definition sufficient?",
    "opts": [
      "It contains all information needed to determine future subproblem results",
      "It includes every original input object by reference",
      "It always uses exactly one integer",
      "It omits choices that differ in cost"
    ],
    "a": 0,
    "e": "Equivalent state keys must have the same remaining problem. A compact integer may suffice for some tasks but not all; references alone do not define sufficiency, and relevant costs cannot be omitted.",
    "intro": "Ask whether two equal keys can have different legal futures.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "For Fibonacci values F(0)=0 and F(1)=1, why does memoization avoid repeated recursion?",
    "opts": [
      "It eliminates both base cases",
      "It makes the numeric result constant",
      "It explores every recursion branch twice",
      "Each distinct F(k) is computed once and reused"
    ],
    "a": 3,
    "e": "The naive recursion repeatedly asks for the same k. Caching collapses those repeated subproblems; base cases remain necessary, and results still depend on k.",
    "intro": "Count unique states rather than recursive paths.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "For ways to climb n steps using jumps of 1 or 2, with ways(0)=1, which recurrence fits n>=2?",
    "opts": [
      "ways(n)=2n",
      "ways(n)=ways(n+1)+ways(n+2)",
      "ways(n)=ways(n-1)+ways(n-2)",
      "ways(n)=ways(n-1)*ways(n-2)"
    ],
    "a": 2,
    "e": "The final jump comes from n-1 or n-2, two disjoint alternatives whose counts add. Multiplication combines independent choices rather than alternatives; 2n is not the recurrence, and forward dependencies do not reach the stated bases.",
    "intro": "Partition valid paths by their final jump.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "A house-robber DP forbids taking adjacent houses. Why is taking every positive-valued house invalid?",
    "opts": [
      "The answer must use exactly half the houses",
      "Positive neighboring houses still violate the adjacency constraint",
      "Positive values are never allowed",
      "The first house must always be skipped"
    ],
    "a": 1,
    "e": "Value does not remove the feasibility constraint. A recurrence compares skipping a house with taking it plus the optimum before its neighbor; no fixed first choice or count is required.",
    "intro": "Optimize only among feasible selections.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "Coin-change asks for the minimum coins for exact amount a. How should an unreachable positive amount be initialized?",
    "opts": [
      "Infinity before considering valid predecessors",
      "Zero for every amount",
      "One for every amount",
      "The amount of the largest coin"
    ],
    "a": 0,
    "e": "Zero is reserved for making amount zero. Infinity means no valid construction is known, preventing an impossible predecessor from looking cheapest. A default one or coin value invents a construction.",
    "intro": "Represent impossible subproblems separately from zero-cost ones.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "A one-dimensional DP reads only its previous two states. What space can compute the final value when reconstruction is not requested?",
    "opts": [
      "O(n squared) necessarily",
      "O(2 to the power n)",
      "No storage at all",
      "O(1) extra state"
    ],
    "a": 3,
    "e": "Two rolling values preserve the needed dependencies. The full history is unnecessary for this value-only contract; exponential storage or no state at all does not follow.",
    "intro": "Keep exactly the states needed by the next transition.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "A memoization check uses if(cache[n]) to detect a cached numeric result. Why can this repeat work?",
    "opts": [
      "Array indices cannot be numeric",
      "Memoization requires sorting keys",
      "A valid cached zero is falsy",
      "Every positive number is falsy"
    ],
    "a": 2,
    "e": "Zero may be a legitimate result but fails the truthiness condition. Check key presence instead; numeric indices, positive values and key order are not the issue.",
    "intro": "Distinguish absence from a stored value of zero.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "A DP has n states and each transition scans at most k candidates. What is its usual transition-work bound?",
    "opts": [
      "O(1)",
      "O(nk)",
      "O(n+k) regardless of dependencies",
      "O(log n)"
    ],
    "a": 1,
    "e": "Summing at most k work for each of n states gives O(nk). An additive bound needs shared amortized work not stated here; logarithmic or constant bounds ignore the loops.",
    "intro": "Multiply the number of states by work per state.",
    "tags": [
      "DSA Advanced",
      "11"
    ]
  },
  {
    "q": "For grid paths moving only right and down, what determines ways[r][c] at an open non-start cell?",
    "opts": [
      "ways[r-1][c]+ways[r][c-1], treating outside cells as zero",
      "ways[r+1][c]+ways[r][c+1] in a forward fill",
      "The maximum of row and column indices",
      "The product of all grid values"
    ],
    "a": 0,
    "e": "Every route enters from above or left, disjoint last moves whose counts add. A forward fill cannot read uncomputed future cells, and coordinates or products do not count paths.",
    "intro": "Partition paths by their last move into the cell.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "A grid-path DP encounters a blocked cell. How many valid paths may pass through it?",
    "opts": [
      "One even if unreachable",
      "The sum of all earlier rows",
      "The same count as the previous cell",
      "Zero"
    ],
    "a": 3,
    "e": "Blocking removes the cell from every valid path, so its state is zero. Reusing another count can leak routes through the obstacle; global sums are unrelated.",
    "intro": "An obstacle is a forbidden state, not just an expensive one.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "What does the usual longest-common-subsequence state L(i,j) describe for prefixes of lengths i and j?",
    "opts": [
      "The edit distance after sorting both prefixes",
      "The length of their concatenation",
      "The LCS length of those two prefixes",
      "The number of matching substrings anywhere"
    ],
    "a": 2,
    "e": "The state concerns order-preserving subsequences of two prefixes, not contiguous substrings, sorted data or concatenated length. Precise prefix bounds define its dependencies.",
    "intro": "Name both input prefixes and the requested quantity.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "For LCS, if the last characters of the two prefixes match, which transition is valid?",
    "opts": [
      "i+j",
      "1+L(i-1,j-1)",
      "L(i-1,j)+L(i,j-1)",
      "Always zero"
    ],
    "a": 1,
    "e": "One shared final character extends an optimal subsequence of the shorter prefixes. Adding neighboring lengths double-counts incompatible solutions; zero and prefix sums ignore matching structure.",
    "intro": "Use the matching pair once, then reduce both prefixes.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "Levenshtein distance permits insertion, deletion and substitution, each cost1. What is the distance from an empty string to a string of length j?",
    "opts": [
      "j",
      "0",
      "1 for every nonempty string",
      "j squared"
    ],
    "a": 0,
    "e": "Starting empty requires j insertions. Zero would leave the target absent, one cannot create arbitrary length in this model, and quadratic cost overcharges unit insertions.",
    "intro": "Apply the operation model to the simplest boundary row.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "In zero-one knapsack compressed to one capacity array, why iterate capacities downward for each item?",
    "opts": [
      "To allow unlimited copies of the item",
      "To sort items by profit",
      "Because capacities must be negative",
      "So the current item cannot feed another state for that same item"
    ],
    "a": 3,
    "e": "Descending order reads states from before this item was considered. Ascending can reuse the current item repeatedly, which solves an unbounded variant. Sorting and negative capacities are unrelated.",
    "intro": "Track whether a predecessor already includes the current item.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "A DP table has r rows and c columns. Each cell does constant work from earlier cells. What are time and full-table space?",
    "opts": [
      "O(log(rc)) time and O(rc) space",
      "O(rc squared) time and O(r) space",
      "O(rc) time and O(rc) space",
      "O(r+c) time and O(1) space always"
    ],
    "a": 2,
    "e": "There are r*c cells and constant work per cell. Storing all of them costs the same order; space compression needs a separate dependency argument, and an extra factor or logarithmic work is unsupported.",
    "intro": "Count cells before considering optional space compression.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "A value-only DP uses rolling rows. Why may that be insufficient to reconstruct one optimal alignment afterward?",
    "opts": [
      "Reconstruction is mathematically impossible",
      "The discarded predecessor choices may be needed for the trace",
      "Rolling rows always change the final optimum",
      "Every alignment has length one"
    ],
    "a": 1,
    "e": "The optimum value can survive while the chosen route does not. Reconstruction needs retained decisions or a recomputation strategy; rolling rows do not inherently change the value or make reconstruction impossible.",
    "intro": "A score and the path achieving it are different outputs.",
    "tags": [
      "DSA Advanced",
      "12"
    ]
  },
  {
    "q": "For JavaScript Number operands, what integer width do bitwise operators such as XOR normally use?",
    "opts": [
      "32-bit integers",
      "Arbitrary precision integers",
      "64-bit floating point bit patterns directly",
      "Exactly 8 bits"
    ],
    "a": 0,
    "e": "Number bitwise operations convert to 32-bit integer representations. BigInt offers a different arbitrary-width model; floating arithmetic and byte width are different operations.",
    "intro": "Separate Number arithmetic from Number bitwise conversion.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "Why does x XOR x equal zero for an integer bit pattern?",
    "opts": [
      "XOR adds the values normally",
      "XOR always returns its left operand",
      "It depends on decimal digit count",
      "Each equal bit pair produces zero"
    ],
    "a": 3,
    "e": "XOR returns one only for differing bits, so every position cancels. This is not ordinary addition, projection or a decimal-digit operation.",
    "intro": "Apply the two-input bit truth table position by position.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "Every 32-bit integer in an array appears twice except one appearing once. What does XOR of all values recover?",
    "opts": [
      "The count of distinct values",
      "The arithmetic sum",
      "The unpaired value",
      "The largest value"
    ],
    "a": 2,
    "e": "Equal pairs cancel and XOR with zero preserves the remaining value. The result need not be largest and is neither a count nor an arithmetic sum. The exact multiplicity assumption matters.",
    "intro": "Pair equal values using XOR’s associative cancellation.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "For a nonzero unsigned bit pattern n, what does n AND (n-1) do?",
    "opts": [
      "Multiply it by two",
      "Clear its lowest set bit",
      "Set its highest zero bit",
      "Reverse all bits"
    ],
    "a": 1,
    "e": "Subtracting one flips the trailing zeros and lowest one; AND keeps the rest and clears that one. Shifting, complementing and reversal do different work.",
    "intro": "Trace a pattern ending in one followed by zeros.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "For nonnegative 32-bit n, which condition identifies a power of two?",
    "opts": [
      "n>0 and (n & (n-1))===0",
      "n===0 only",
      "n is any even number",
      "n has an even count of decimal digits"
    ],
    "a": 0,
    "e": "A positive power of two has exactly one set bit, which the AND expression removes completely. Zero also satisfies the AND equality but must be excluded; evenness and decimal length are insufficient.",
    "intro": "Check both the bit invariant and the zero boundary.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "What does JavaScript 1 << 32 evaluate to under Number bitwise semantics?",
    "opts": [
      "4294967296",
      "0",
      "A RangeError",
      "1"
    ],
    "a": 3,
    "e": "The shift count uses only its low five bits, so 32 acts like zero. Ordinary exponentiation would produce 4294967296; this operation neither yields zero nor throws for this count.",
    "intro": "Check how Number shifts normalize their shift count.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "Which operator shifts a JavaScript Number right while filling from the left with zeros?",
    "opts": [
      "<<",
      "^",
      ">>>",
      ">>"
    ],
    "a": 2,
    "e": "Unsigned right shift inserts zero bits. Signed right shift preserves the sign bit; left shift and XOR are not right-shift operations. The Number result is interpreted unsigned.",
    "intro": "Distinguish sign propagation from zero fill.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "A bitmask represents a subset of n items using bit i for membership. How many masks exist?",
    "opts": [
      "n+1",
      "2 to the power n",
      "n factorial",
      "n squared"
    ],
    "a": 1,
    "e": "Each of n bits independently has two states. Factorial counts permutations; quadratic and linear alternatives do not encode all independent membership choices. Number masks still require explicit 32-bit limits.",
    "intro": "Each membership bit is an independent binary choice.",
    "tags": [
      "DSA Advanced",
      "13"
    ]
  },
  {
    "q": "Why does balanced merge sort take O(n log n) comparison work in the worst case?",
    "opts": [
      "O(n) merge work occurs across each of O(log n) levels",
      "Each merge takes constant time",
      "Every partition removes exactly one item",
      "Its input is always already sorted"
    ],
    "a": 0,
    "e": "At each recursion depth, disjoint subarrays contain n elements altogether, and halving creates logarithmic depth. Individual merges are not constant; one-item shrink describes a different recurrence.",
    "intro": "Sum work across a whole depth before summing depths.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "A stable merge compares equal keys from its left and right halves. Which item should it choose first to preserve original order?",
    "opts": [
      "The right-half item always",
      "Whichever has a larger memory address",
      "A randomly chosen item",
      "The left-half item"
    ],
    "a": 3,
    "e": "The left half preceded the right half in the original input, so choosing left on equality preserves cross-half order. Address and random choices supply no such guarantee; right-first reverses some equals.",
    "intro": "Track where equal items appeared before splitting.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "What creates quicksort’s O(n squared) worst case with a consistently poor pivot?",
    "opts": [
      "Its comparison function returns numeric values",
      "The input contains no duplicate references",
      "Partitions repeatedly split into sizes 0 and n-1",
      "Every partition splits evenly"
    ],
    "a": 2,
    "e": "An almost-full recursive subproblem yields n+(n-1)+... work. Balanced partitions give O(n log n); numeric comparators and reference uniqueness do not force the bad recurrence.",
    "intro": "Write the sizes of the recursive subproblems.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "What guarantee does random-pivot quicksort usually provide for fixed input under independent uniform pivot choices?",
    "opts": [
      "A stable result automatically",
      "Expected O(n log n) work, with quadratic worst cases still possible",
      "O(n log n) worst case for every random sequence",
      "O(n) sorting for arbitrary comparisons"
    ],
    "a": 1,
    "e": "Randomization makes consistently poor splits unlikely, yielding an expectation over choices. It does not eliminate every bad sequence, violate comparison lower bounds or ensure equal-key stability.",
    "intro": "Expected over random choices is not a worst-case guarantee.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "For in-place array heap sort with iterative sifting, which property is typical?",
    "opts": [
      "O(n log n) worst-case time and O(1) auxiliary storage",
      "Stable ordering of equal keys by default",
      "O(n) worst-case comparison sorting",
      "A full extra array required for every merge"
    ],
    "a": 0,
    "e": "The array holds the heap and sorted suffix, while iterative sifting needs constant auxiliary state. Swaps can reorder equals; root removals retain logarithmic work, and merge storage belongs to merge sort.",
    "intro": "Separate the input array from additional working storage.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "A comparison sort handles n arbitrary distinct keys. Why is Omega(n log n) a worst-case comparison lower bound?",
    "opts": [
      "Every sort must allocate n log n array cells",
      "Each pair of values must be compared directly",
      "All non-comparison sorts have the same lower bound",
      "A binary decision tree must distinguish n factorial orders"
    ],
    "a": 3,
    "e": "A depth-d binary tree has at most 2^d leaves, and n-factorial possible orders require logarithmic-in-factorial depth. The argument counts comparisons, not allocation or every pair, and does not cover all integer-key models.",
    "intro": "Count distinguishable input orders and outcomes per comparison.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "A sorting proof says the prefix is sorted but never shows it contains the original values. What is missing?",
    "opts": [
      "A fixed pivot index",
      "A requirement that every key be unique",
      "Preservation of the input multiset",
      "A longer function name"
    ],
    "a": 2,
    "e": "A program returning fabricated sorted values satisfies order alone. Correct sorting also preserves each input value and its multiplicity; naming, pivots or uniqueness do not establish that.",
    "intro": "Order and preservation are separate obligations.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "Why can counting sort run in O(n+k) without contradicting the comparison-sort lower bound?",
    "opts": [
      "It sorts only already-sorted inputs",
      "It uses a bounded integer key range of size k, not comparisons alone",
      "It proves comparison sorting always linear",
      "It ignores duplicate values"
    ],
    "a": 1,
    "e": "The model includes key-indexed counts and an explicit range parameter, so the comparison decision-tree argument does not apply. It can handle duplicates and unsorted input; it says nothing about arbitrary comparison keys.",
    "intro": "State both the key domain and the allowed operations.",
    "tags": [
      "DSA Advanced",
      "14"
    ]
  },
  {
    "q": "A dependency graph may contain a directed cycle. What is the appropriate topological-order outcome if one exists?",
    "opts": [
      "Report that no full topological order exists",
      "Return a partial order as if complete",
      "Ignore the cycle’s last edge silently",
      "Sort vertex labels and call it valid"
    ],
    "a": 0,
    "e": "A cycle makes all-edge forward ordering impossible. A partial list is incomplete, and silently changing edges or labels changes the problem rather than satisfying its constraints.",
    "intro": "Validate every constraint before claiming a complete ordering.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A graph has unit-cost edges and asks for fewest hops from one start. Which choice best matches the contract?",
    "opts": [
      "DFS and first discovered route",
      "Greedy smallest vertex id",
      "A sort of all edge endpoints",
      "BFS with a FIFO queue"
    ],
    "a": 3,
    "e": "BFS processes increasing hop distance. DFS can first find a long detour; label greed and sorting endpoints do not encode routes. A priority queue is unnecessary for equal unit costs.",
    "intro": "Match the frontier ordering to the distance metric.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A weighted graph permits negative edges but is guaranteed acyclic. Which method can compute shortest paths in O(V+E) after a topological order?",
    "opts": [
      "Dijkstra without checking its assumptions",
      "Always choose the locally lightest outgoing edge",
      "Relax outgoing edges once in topological order",
      "Ordinary BFS ignoring weights"
    ],
    "a": 2,
    "e": "Topological order ensures each predecessor is final before its outgoing relaxations, regardless of weight sign. BFS ignores weights, Dijkstra’s usual proof fails, and local edge greed ignores complete path cost.",
    "intro": "Use acyclicity to order dependencies instead of relying on nonnegative costs.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A cache key omits remaining capacity in a knapsack DP. Why can a test expose incorrect reuse?",
    "opts": [
      "The algorithm must become a heap",
      "Equal keys may represent different feasible choices",
      "All capacities always have the same optimum",
      "Caching automatically validates its own key"
    ],
    "a": 1,
    "e": "Remaining capacity affects which items fit, so its omission merges different subproblems. A cache does not prove equivalence, and no heap follows from the defect.",
    "intro": "Compare two states with the same item index but different capacity.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A solution meets every sample but changes a frozen input array despite promising no mutation. What should validation conclude?",
    "opts": [
      "The ownership contract is violated",
      "It is correct because the returned values match",
      "Frozen input should be excluded without changing the brief",
      "All algorithms must mutate arrays"
    ],
    "a": 0,
    "e": "Correctness includes the explicit input-ownership contract. Samples cannot waive it; changing the domain afterward hides the defect. Many algorithms work with copies or separate state.",
    "intro": "Check all promised behavior, not only one output.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A proposed algorithm returns all matching pairs. Why must its complexity discussion mention result count K?",
    "opts": [
      "Output arrays are free in every model",
      "K always equals n",
      "K can be ignored if hashing is used",
      "Producing K output pairs requires output work"
    ],
    "a": 3,
    "e": "An output-sensitive bound must include work to materialize results, which may exceed n. Hashing can reduce search overhead but cannot emit arbitrarily many pairs for free; K depends on the data.",
    "intro": "Measure search work and output work separately.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "A shortest-path implementation returns a distance but no route. The requirement now asks for one route too. What additional state commonly supports it?",
    "opts": [
      "A sorted copy of vertex labels",
      "The number of queue pops alone",
      "A predecessor per improved vertex",
      "Only the largest edge weight"
    ],
    "a": 2,
    "e": "Recording the edge or predecessor responsible for each improvement supports backward reconstruction. Aggregate weights, label order and operation counts do not identify the chosen route.",
    "intro": "Preserve the decisions needed to reconstruct the result.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  },
  {
    "q": "What is the strongest basis for choosing between greedy, graph search and dynamic programming?",
    "opts": [
      "Always choosing dynamic programming",
      "The problem’s state, constraints, objective and a correctness argument",
      "The shortest implementation on one example",
      "Which method has the newest name"
    ],
    "a": 1,
    "e": "Technique selection follows the structure and proof obligations of the problem. Code length or novelty gives no validity guarantee, and one method does not fit every contract.",
    "intro": "Start with the problem’s model before choosing a technique.",
    "tags": [
      "DSA Advanced",
      "15"
    ]
  }
];
