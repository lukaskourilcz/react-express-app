// Discrete Mathematics roadmap questions (40): 5 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const discreteMathSeeds: Seed[] = [
  // ── Level 1 — Propositional Logic & Truth Tables ──
  { q: 'What is the negation of "P AND Q"?', opts: ['¬P AND ¬Q', '¬P OR ¬Q', 'P OR Q', '¬P AND Q'], a: 1, e: 'By De Morgan, ¬(P AND Q) = ¬P OR ¬Q.', tags: ['Discrete Math', 'Logic'] },
  { q: 'What is the truth value of P → Q when P is true and Q is false?', opts: ['True', 'False', 'Undefined', 'Depends on P'], a: 1, e: 'An implication is false only when the antecedent is true and the consequent false.', tags: ['Discrete Math', 'Logic'] },
  { q: 'Which formula is a tautology?', opts: ['P AND ¬P', 'P OR ¬P', 'P → ¬P', 'P ↔ ¬P'], a: 1, e: 'P OR ¬P (law of excluded middle) is always true.', tags: ['Discrete Math', 'Logic'] },
  { q: 'The biconditional P ↔ Q is true exactly when:', opts: ['P and Q have the same truth value', 'P is true', 'Q is false', 'P and Q differ'], a: 0, e: 'P ↔ Q holds when both sides share the same truth value.', tags: ['Discrete Math', 'Logic'] },
  { q: 'The contrapositive of P → Q is:', opts: ['Q → P', '¬P → ¬Q', '¬Q → ¬P', 'P → ¬Q'], a: 2, e: 'The contrapositive ¬Q → ¬P is logically equivalent to P → Q.', tags: ['Discrete Math', 'Logic'] },
  { q: 'Simplify P AND (P OR Q).', opts: ['P', 'Q', 'P OR Q', 'True'], a: 0, e: 'By the absorption law, P AND (P OR Q) = P.', tags: ['Discrete Math', 'Logic'] },
  { q: 'If P is false, what is the truth value of P → Q?', opts: ['False', 'True', 'Equal to Q', 'Undefined'], a: 1, e: 'An implication with a false antecedent is vacuously true.', tags: ['Discrete Math', 'Logic'] },
  { q: 'What is the negation of "P OR Q"?', opts: ['¬P OR ¬Q', '¬P AND ¬Q', 'P AND Q', '¬P AND Q'], a: 1, e: 'By De Morgan, ¬(P OR Q) = ¬P AND ¬Q.', tags: ['Discrete Math', 'Logic'] },

  // ── Level 2 — Sets, Relations, Functions, Cardinality ──
  { q: 'If |A| = 3, |B| = 4, and |A ∩ B| = 1, what is |A ∪ B|?', opts: ['7', '6', '8', '5'], a: 1, e: 'Inclusion-exclusion: 3 + 4 − 1 = 6.', tags: ['Discrete Math', 'Set Theory'] },
  { q: 'How many subsets does a set of 4 elements have?', opts: ['8', '12', '16', '32'], a: 2, e: 'A set of n elements has 2^n subsets; 2^4 = 16.', tags: ['Discrete Math', 'Set Theory'] },
  { q: 'A function that maps distinct inputs to distinct outputs is called:', opts: ['Surjective', 'Injective', 'Constant', 'Periodic'], a: 1, e: 'Injective (one-to-one) means distinct inputs give distinct outputs.', tags: ['Discrete Math', 'Functions'] },
  { q: 'If |A| = 3 and |B| = 5, what is |A × B|?', opts: ['8', '15', '25', '2'], a: 1, e: 'The Cartesian product has |A|·|B| = 3·5 = 15 ordered pairs.', tags: ['Discrete Math', 'Set Theory'] },
  { q: 'What is the cardinality of the power set of {1, 2, 3}?', opts: ['3', '6', '8', '9'], a: 2, e: 'The power set has 2^3 = 8 elements.', tags: ['Discrete Math', 'Set Theory'] },
  { q: 'A relation that is reflexive, symmetric, and transitive is called:', opts: ['A partial order', 'An equivalence relation', 'A function', 'A bijection'], a: 1, e: 'Those three properties together define an equivalence relation.', tags: ['Discrete Math', 'Relations'] },
  { q: 'Which of these sets is uncountable?', opts: ['The integers', 'The rationals', 'The real numbers', 'The natural numbers'], a: 2, e: 'The reals are uncountable (Cantor); the others are countably infinite.', tags: ['Discrete Math', 'Cardinality'] },
  { q: 'How many functions are there from a 2-element set to a 3-element set?', opts: ['6', '8', '9', '5'], a: 2, e: 'Each of the 2 inputs has 3 choices: 3^2 = 9.', tags: ['Discrete Math', 'Functions'] },

  // ── Level 3 — Combinatorics ──
  { q: 'What is 5! (5 factorial)?', opts: ['25', '60', '120', '720'], a: 2, e: '5! = 5·4·3·2·1 = 120.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'How many ways can you choose 2 items from 5 when order does not matter?', opts: ['10', '20', '25', '5'], a: 0, e: 'C(5,2) = 10.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'How many ordered arrangements of 2 objects taken from 5 are there?', opts: ['10', '20', '25', '120'], a: 1, e: 'P(5,2) = 5·4 = 20.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'The sum of all entries in row n of Pascal\'s triangle equals:', opts: ['n^2', '2^n', 'n!', '2n'], a: 1, e: 'The binomial coefficients in row n sum to 2^n.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'With 13 people in a room, what does the pigeonhole principle guarantee about birth months?', opts: ['All share a month', 'At least two share a month', 'No two share a month', 'Exactly two share a month'], a: 1, e: 'With 13 people and 12 months, at least two must share a month.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'What is the coefficient of x^2·y^3 in the expansion of (x + y)^5?', opts: ['5', '10', '15', '20'], a: 1, e: 'The coefficient is C(5,2) = C(5,3) = 10.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'How many ways can a committee of 3 be chosen from 10 people?', opts: ['30', '120', '720', '1000'], a: 1, e: 'C(10,3) = 120.', tags: ['Discrete Math', 'Combinatorics'] },
  { q: 'How many distinct arrangements are there of the letters in "LEVEL"?', opts: ['120', '60', '30', '20'], a: 2, e: '5!/(2!·2!) = 120/4 = 30 (two Ls, two Es).', tags: ['Discrete Math', 'Combinatorics'] },

  // ── Level 4 — Graph Theory ──
  { q: 'How many edges does a tree with n vertices have?', opts: ['n', 'n − 1', 'n + 1', '2n'], a: 1, e: 'A tree on n vertices always has exactly n − 1 edges.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'A connected graph has an Euler circuit if and only if:', opts: ['It is a tree', 'Every vertex has even degree', 'It has no cycles', 'Every vertex has odd degree'], a: 1, e: 'An Euler circuit exists iff the graph is connected and every vertex has even degree.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'If a graph has 5 edges, what is the sum of all vertex degrees?', opts: ['5', '10', '25', '15'], a: 1, e: 'By the handshake lemma, the degree sum equals 2·(edges) = 10.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'How many edges does the complete graph K4 have?', opts: ['4', '6', '8', '12'], a: 1, e: 'C(4,2) = 6 edges.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'What is the chromatic number of the complete graph K_n?', opts: ['2', 'n − 1', 'n', 'n/2'], a: 2, e: 'Every pair of vertices is adjacent, so all n vertices need different colors.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'A Hamiltonian path in a graph:', opts: ['Visits every edge once', 'Visits every vertex exactly once', 'Is always a cycle', 'Uses the fewest edges'], a: 1, e: 'A Hamiltonian path visits each vertex exactly once.', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'What is the chromatic number of a bipartite graph that contains at least one edge?', opts: ['1', '2', '3', '4'], a: 1, e: 'Bipartite graphs are exactly the 2-colorable graphs (once an edge is present).', tags: ['Discrete Math', 'Graph Theory'] },
  { q: 'A connected graph with n vertices and exactly n − 1 edges must be:', opts: ['A complete graph', 'A tree', 'A cycle', 'Disconnected'], a: 1, e: 'Connected with n − 1 edges is a defining characterization of a tree.', tags: ['Discrete Math', 'Graph Theory'] },

  // ── Level 5 — Recurrences, Induction & Number-Theoretic Counting ──
  { q: 'If a_n = 2·a_(n−1) with a_0 = 1, what is a_4?', opts: ['8', '16', '12', '32'], a: 1, e: 'The closed form is a_n = 2^n, so a_4 = 16.', tags: ['Discrete Math', 'Recurrences'] },
  { q: 'For the Fibonacci sequence with F_1 = F_2 = 1, what is F_7?', opts: ['8', '13', '21', '11'], a: 1, e: '1, 1, 2, 3, 5, 8, 13 — so F_7 = 13.', tags: ['Discrete Math', 'Recurrences'] },
  { q: 'What is the value of 1 + 2 + ... + 10?', opts: ['45', '50', '55', '100'], a: 2, e: 'n(n+1)/2 = 10·11/2 = 55.', tags: ['Discrete Math', 'Induction'] },
  { q: 'In a proof by mathematical induction, the first step is to:', opts: ['Assume P(k)', 'Prove the base case', 'Prove P(k+1)', 'State the conclusion'], a: 1, e: 'Induction begins by verifying the base case.', tags: ['Discrete Math', 'Induction'] },
  { q: 'What are the characteristic roots of a_n = 5·a_(n−1) − 6·a_(n−2)?', opts: ['1 and 6', '2 and 3', '−2 and −3', '5 and 6'], a: 1, e: 'r^2 − 5r + 6 = 0 factors as (r−2)(r−3), giving roots 2 and 3.', tags: ['Discrete Math', 'Recurrences'] },
  { q: 'The sum of the first n odd numbers is n^2. What is the sum of the first 6 odd numbers?', opts: ['30', '36', '21', '25'], a: 1, e: '6^2 = 36 (1+3+5+7+9+11).', tags: ['Discrete Math', 'Induction'] },
  { q: 'How many positive divisors does 12 have?', opts: ['4', '5', '6', '12'], a: 2, e: '1, 2, 3, 4, 6, 12 — that is 6 divisors.', tags: ['Discrete Math', 'Number Theory'] },
  { q: 'How many integers from 1 to 100 are divisible by 6?', opts: ['16', '17', '12', '20'], a: 0, e: 'The count is ⌊100/6⌋ = 16.', tags: ['Discrete Math', 'Number Theory'] },
];
