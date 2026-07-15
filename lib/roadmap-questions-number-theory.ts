// Number Theory roadmap questions (40): 5 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const numberTheorySeeds: Seed[] = [
  // ── Level 1 — Divisibility & Primes ──
  { q: 'What is gcd(48, 36)?', opts: ['6', '12', '24', '4'], a: 1, e: '48 = 2^4·3 and 36 = 2^2·3^2, so gcd = 2^2·3 = 12.', tags: ['Number Theory', 'Divisibility'] },
  { q: 'What is lcm(6, 8)?', opts: ['12', '24', '48', '14'], a: 1, e: '6 = 2·3 and 8 = 2^3, so lcm = 2^3·3 = 24.', tags: ['Number Theory', 'Divisibility'] },
  { q: 'Which of these numbers is prime?', opts: ['51', '87', '89', '91'], a: 2, e: '51 = 3·17, 87 = 3·29, 91 = 7·13, but 89 has no divisor up to its square root, so it is prime.', tags: ['Number Theory', 'Primes'] },
  { q: 'How many positive divisors does 36 have?', opts: ['6', '9', '8', '12'], a: 1, e: '36 = 2^2·3^2, so the divisor count is (2+1)(2+1) = 9.', tags: ['Number Theory', 'Divisibility'] },
  { q: 'Using the Euclidean algorithm, what is gcd(1071, 462)?', opts: ['3', '7', '21', '147'], a: 2, e: '1071 = 2·462 + 147; 462 = 3·147 + 21; 147 = 7·21 + 0, so gcd = 21.', tags: ['Number Theory', 'Euclidean Algorithm'] },
  { q: 'If gcd(a, b) = 6, lcm(a, b) = 36, and a = 12, what is b?', opts: ['9', '18', '24', '36'], a: 1, e: 'Since gcd·lcm = a·b, we get a·b = 216, so b = 216/12 = 18.', tags: ['Number Theory', 'GCD and LCM'] },
  { q: 'What is the prime factorization of 360?', opts: ['2^3·3^2·5', '2^2·3^2·5', '2^3·3·5^2', '2^4·3·5'], a: 0, e: '360 = 8·45 = 2^3·(9·5) = 2^3·3^2·5.', tags: ['Number Theory', 'Primes'] },
  { q: 'By Euclid\'s lemma, if a prime p divides the product ab, then:', opts: ['p divides a or p divides b', 'p divides a and p divides b', 'p divides a + b', 'p divides a - b'], a: 0, e: 'Euclid\'s lemma: if a prime divides a product, it must divide at least one of the factors.', tags: ['Number Theory', 'Primes'] },

  // ── Level 2 — Modular Arithmetic & Congruences ──
  { q: 'What is 17 mod 5?', opts: ['1', '2', '3', '7'], a: 1, e: '17 = 3·5 + 2, so the remainder is 2.', tags: ['Number Theory', 'Modular Arithmetic'] },
  { q: 'Compute (7 + 8) mod 12.', opts: ['3', '5', '15', '7'], a: 0, e: '7 + 8 = 15, and 15 mod 12 = 3.', tags: ['Number Theory', 'Modular Arithmetic'] },
  { q: 'Compute (6 × 7) mod 10.', opts: ['2', '4', '0', '12'], a: 0, e: '6·7 = 42, and 42 mod 10 = 2.', tags: ['Number Theory', 'Modular Arithmetic'] },
  { q: 'What is 2^10 mod 3?', opts: ['0', '1', '2', '4'], a: 1, e: '2 ≡ -1 (mod 3), so 2^10 ≡ (-1)^10 = 1 (mod 3).', tags: ['Number Theory', 'Modular Arithmetic'] },
  { q: 'What is the additive inverse of 5 modulo 12?', opts: ['5', '7', '12', '-5'], a: 1, e: 'We need x with 5 + x ≡ 0 (mod 12); x = 7 since 5 + 7 = 12 ≡ 0.', tags: ['Number Theory', 'Congruences'] },
  { q: 'What is the multiplicative inverse of 3 modulo 7?', opts: ['2', '3', '5', '4'], a: 2, e: '3·5 = 15 ≡ 1 (mod 7), so the inverse of 3 is 5.', tags: ['Number Theory', 'Congruences'] },
  { q: 'Solve 4x ≡ 1 (mod 7).', opts: ['2', '4', '3', '5'], a: 0, e: '4·2 = 8 ≡ 1 (mod 7), so x ≡ 2.', tags: ['Number Theory', 'Congruences'] },
  { q: 'If a ≡ b (mod n), which statement must hold for any positive integer k?', opts: ['a^k ≡ b^k (mod n)', 'a ≡ b (mod 2n)', 'a + 1 ≡ b (mod n)', 'ab ≡ 1 (mod n)'], a: 0, e: 'Congruence is preserved under multiplication, so raising both sides to the k-th power gives a^k ≡ b^k (mod n).', tags: ['Number Theory', 'Congruences'] },

  // ── Level 3 — Fermat, Euler & Totient ──
  { q: 'What is Euler\'s totient φ(10)?', opts: ['2', '4', '5', '10'], a: 1, e: 'The integers coprime to 10 in {1,…,10} are 1, 3, 7, 9, so φ(10) = 4.', tags: ['Number Theory', 'Totient Function'] },
  { q: 'What is φ(7)?', opts: ['6', '7', '1', '3'], a: 0, e: 'For a prime p, φ(p) = p - 1, so φ(7) = 6.', tags: ['Number Theory', 'Totient Function'] },
  { q: 'By Fermat\'s little theorem, what is 2^6 mod 7?', opts: ['1', '2', '0', '6'], a: 0, e: 'Since 7 is prime and gcd(2,7) = 1, Fermat gives 2^(7-1) = 2^6 ≡ 1 (mod 7).', tags: ['Number Theory', 'Fermat\'s Little Theorem'] },
  { q: 'What is φ(12)?', opts: ['6', '4', '8', '12'], a: 1, e: '12 = 2^2·3, so φ(12) = 12·(1/2)·(2/3) = 4.', tags: ['Number Theory', 'Totient Function'] },
  { q: 'Euler\'s theorem a^φ(n) ≡ 1 (mod n) requires which condition?', opts: ['gcd(a, n) = 1', 'a is prime', 'n is prime', 'a < n'], a: 0, e: 'Euler\'s theorem holds precisely when a and n are coprime.', tags: ['Number Theory', 'Euler\'s Theorem'] },
  { q: 'What is 3^100 mod 7?', opts: ['1', '2', '4', '6'], a: 2, e: 'φ(7) = 6 and 100 = 16·6 + 4, so 3^100 ≡ 3^4 = 81 ≡ 4 (mod 7).', tags: ['Number Theory', 'Euler\'s Theorem'] },
  { q: 'What is φ(9)?', opts: ['3', '6', '8', '9'], a: 1, e: 'For p^2 with p prime, φ(p^2) = p^2 - p, so φ(9) = 9 - 3 = 6.', tags: ['Number Theory', 'Totient Function'] },
  { q: 'What is 7^222 mod 10?', opts: ['1', '3', '7', '9'], a: 3, e: 'φ(10) = 4 and 222 = 55·4 + 2, so 7^222 ≡ 7^2 = 49 ≡ 9 (mod 10).', tags: ['Number Theory', 'Euler\'s Theorem'] },

  // ── Level 4 — Diophantine Equations & CRT ──
  { q: 'Does 6x + 9y = 1 have integer solutions?', opts: ['Yes, x = 2, y = -1', 'No, gcd(6, 9) = 3 does not divide 1', 'Yes, infinitely many', 'No, both terms are even'], a: 1, e: 'A linear Diophantine equation ax + by = c is solvable iff gcd(a,b) divides c; here gcd = 3 does not divide 1.', tags: ['Number Theory', 'Diophantine Equations'] },
  { q: 'Which is an integer solution to 3x + 5y = 1?', opts: ['x = 2, y = -1', 'x = 1, y = 1', 'x = 5, y = 3', 'x = -2, y = 1'], a: 0, e: '3·2 + 5·(-1) = 6 - 5 = 1, so (2, -1) works.', tags: ['Number Theory', 'Diophantine Equations'] },
  { q: 'The equation ax + by = c has integer solutions if and only if:', opts: ['gcd(a, b) divides c', 'c divides gcd(a, b)', 'a divides b', 'gcd(a, b) = 1'], a: 0, e: 'Bezout\'s identity: solutions exist exactly when gcd(a, b) divides c.', tags: ['Number Theory', 'Diophantine Equations'] },
  { q: 'Find x mod 15 with x ≡ 2 (mod 3) and x ≡ 3 (mod 5).', opts: ['7', '8', '13', '2'], a: 1, e: 'Testing gives 8: 8 mod 3 = 2 and 8 mod 5 = 3, so x ≡ 8 (mod 15).', tags: ['Number Theory', 'Chinese Remainder Theorem'] },
  { q: 'What is the smallest positive x with x ≡ 1 (mod 2) and x ≡ 2 (mod 3)?', opts: ['3', '5', '1', '4'], a: 1, e: '5 mod 2 = 1 and 5 mod 3 = 2, so x = 5 is the smallest positive solution.', tags: ['Number Theory', 'Chinese Remainder Theorem'] },
  { q: 'If gcd(a, n) = d and d divides b, how many solutions does ax ≡ b (mod n) have mod n?', opts: ['d', '1', 'n', '0'], a: 0, e: 'When d = gcd(a, n) divides b, the congruence has exactly d incongruent solutions modulo n.', tags: ['Number Theory', 'Congruences'] },
  { q: 'Find x mod 12 with x ≡ 2 (mod 4) and x ≡ 1 (mod 3).', opts: ['6', '10', '2', '4'], a: 1, e: '10 mod 4 = 2 and 10 mod 3 = 1, so x ≡ 10 (mod 12).', tags: ['Number Theory', 'Chinese Remainder Theorem'] },
  { q: 'For the Chinese Remainder Theorem to guarantee a unique solution mod the product, the moduli must be:', opts: ['pairwise coprime', 'all prime', 'equal', 'even'], a: 0, e: 'The classical CRT requires the moduli to be pairwise coprime for a unique solution modulo their product.', tags: ['Number Theory', 'Chinese Remainder Theorem'] },

  // ── Level 5 — Quadratic Residues & Primitive Roots ──
  { q: 'Is 3 a quadratic residue modulo 7?', opts: ['Yes', 'No', 'Only if 3 divides 7', 'It is undefined'], a: 1, e: 'The nonzero squares mod 7 are 1, 2, 4; since 3 is not among them, it is a nonresidue.', tags: ['Number Theory', 'Quadratic Residues'] },
  { q: 'What is the Legendre symbol (2/7)?', opts: ['1', '-1', '0', '2'], a: 0, e: '4^2 = 16 ≡ 2 (mod 7), so 2 is a quadratic residue and (2/7) = 1. (Also 7 ≡ -1 mod 8.)', tags: ['Number Theory', 'Quadratic Residues'] },
  { q: 'Which of these is a primitive root modulo 7?', opts: ['1', '2', '3', '6'], a: 2, e: 'Powers of 3 give 3, 2, 6, 4, 5, 1, cycling through all six nonzero residues, so 3 has order 6.', tags: ['Number Theory', 'Primitive Roots'] },
  { q: 'How many primitive roots does 7 have?', opts: ['1', '2', '3', '6'], a: 1, e: 'The count is φ(φ(7)) = φ(6) = 2.', tags: ['Number Theory', 'Primitive Roots'] },
  { q: 'Using Euler\'s criterion, what is the Legendre symbol (3/7)?', opts: ['1', '-1', '0', '3'], a: 1, e: '3^((7-1)/2) = 3^3 = 27 ≡ 6 ≡ -1 (mod 7), so (3/7) = -1.', tags: ['Number Theory', 'Quadratic Residues'] },
  { q: 'For an odd prime p, -1 is a quadratic residue mod p if and only if:', opts: ['p ≡ 1 (mod 4)', 'p ≡ 3 (mod 4)', 'p ≡ 1 (mod 2)', 'always'], a: 0, e: 'By Euler\'s criterion, (-1/p) = 1 exactly when p ≡ 1 (mod 4).', tags: ['Number Theory', 'Quadratic Residues'] },
  { q: 'By Wilson\'s theorem, what is 6! mod 7?', opts: ['0', '1', '5', '6'], a: 3, e: 'Wilson\'s theorem gives (p-1)! ≡ -1 (mod p), so 6! ≡ -1 ≡ 6 (mod 7).', tags: ['Number Theory', 'Advanced Results'] },
  { q: 'Euler\'s criterion states that a^((p-1)/2) mod p equals:', opts: ['the Legendre symbol (a/p)', 'a mod p', '1 always', '0'], a: 0, e: 'For an odd prime p and a not divisible by p, a^((p-1)/2) ≡ (a/p) (mod p), which is ±1.', tags: ['Number Theory', 'Advanced Results'] },
];
