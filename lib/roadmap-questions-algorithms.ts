// "Algorithms" roadmap questions (80): 10 levels × 8, easiest → hardest. The
// content is mathematical & logical reasoning (ratios, modular/bitwise
// arithmetic, combinatorics, probability, recurrences). Authored as a single
// 8-per-level list and built directly (like the other topics). The original
// difficulty-1 tier (logic/sequence/arithmetic warm-ups) was removed for being
// too easy. See lib/roadmap.ts.

import type { Seed } from './roadmap-build';

export const algorithmsSeeds: Seed[] = [
  // ── Level 1 — Ratios & Proportions ─────────────────────────────────────
  { q: 'What is 20% of 150?', opts: ['15', '30', '20', '45'], a: 1, e: '20% = 0.20, and 0.20 × 150 = 30.', tags: ['Algorithms', 'Ratios'] },
  { q: 'If 3 apples cost $6, how much do 5 apples cost at the same rate?', opts: ['$8', '$9', '$10', '$12'], a: 2, e: 'Unit price is $6 ÷ 3 = $2 each, so 5 × $2 = $10.', tags: ['Algorithms', 'Ratios'] },
  { q: 'A car travels 60 miles in 1.5 hours. What is its average speed?', opts: ['30 mph', '45 mph', '90 mph', '40 mph'], a: 3, e: 'Speed = distance ÷ time = 60 ÷ 1.5 = 40 mph.', tags: ['Algorithms', 'Ratios'] },
  { q: 'Two numbers are in the ratio 2:3. If the smaller is 8, what is the larger?', opts: ['12', '10', '16', '6'], a: 0, e: 'Scale factor is 8 ÷ 2 = 4, so the larger is 3 × 4 = 12.', tags: ['Algorithms', 'Ratios'] },
  { q: 'A recipe for 4 people needs 200 g of flour. How much for 6 people?', opts: ['250 g', '300 g', '350 g', '400 g'], a: 1, e: 'Per person = 200 ÷ 4 = 50 g, so 6 × 50 = 300 g.', tags: ['Algorithms', 'Ratios'] },
  { q: 'A shirt costs $40 and is discounted by 25%. What is the sale price?', opts: ['$35', '$25', '$30', '$15'], a: 2, e: 'Discount = 0.25 × 40 = $10, so the price is 40 − 10 = $30.', tags: ['Algorithms', 'Ratios'] },
  { q: 'If 5 workers build a wall in 12 days, how long for 10 workers (same rate)?', opts: ['24 days', '10 days', '12 days', '6 days'], a: 3, e: 'Twice the workers means half the time: 12 ÷ 2 = 6 days.', tags: ['Algorithms', 'Ratios'] },
  { q: 'What percentage is 18 out of 24?', opts: ['75%', '60%', '72%', '80%'], a: 0, e: '18 ÷ 24 = 0.75 = 75%.', tags: ['Algorithms', 'Ratios'] },

  // ── Level 2 — Modular Arithmetic ───────────────────────────────────────
  { q: 'What is 17 mod 5?', opts: ['3', '1', '2', '4'], a: 2, e: '17 = 3×5 + 2, so the remainder is 2.', tags: ['Algorithms', 'Modular'] },
  { q: 'What is 100 mod 7?', opts: ['1', '3', '4', '2'], a: 3, e: '100 = 14×7 + 2, so 100 mod 7 = 2.', tags: ['Algorithms', 'Modular'] },
  { q: 'It is 10 o’clock. What hour is it 5 hours later (12-hour clock)?', opts: ['3', '2', '4', '15'], a: 0, e: '(10 + 5) mod 12 = 15 mod 12 = 3 o’clock.', tags: ['Algorithms', 'Modular'] },
  { q: 'Today is Monday. What day is it 100 days from now?', opts: ['Monday', 'Wednesday', 'Tuesday', 'Thursday'], a: 1, e: '100 mod 7 = 2, so two days after Monday is Wednesday.', tags: ['Algorithms', 'Modular'] },
  { q: 'What is (23 + 19) mod 24?', opts: ['42', '6', '18', '0'], a: 2, e: '23 + 19 = 42, and 42 mod 24 = 42 − 24 = 18.', tags: ['Algorithms', 'Modular'] },
  { q: 'What is 3⁴ mod 5?', opts: ['0', '2', '4', '1'], a: 3, e: '3⁴ = 81, and 81 = 16×5 + 1, so the remainder is 1.', tags: ['Algorithms', 'Modular'] },
  { q: 'What is 2¹⁰ mod 7?', opts: ['2', '1', '4', '0'], a: 0, e: '2¹⁰ = 1024 = 146×7 + 2, so 1024 mod 7 = 2.', tags: ['Algorithms', 'Modular'] },
  { q: 'What is the last digit of 7⁷ (i.e. 7⁷ mod 10)?', opts: ['1', '3', '7', '9'], a: 1, e: 'Powers of 7 cycle 7,9,3,1; 7 mod 4 = 3, so the 3rd in the cycle is 3.', tags: ['Algorithms', 'Modular'] },

  // ── Level 3 — Combinatorics ────────────────────────────────────────────
  { q: 'What is 5! (5 factorial)?', opts: ['25', '60', '720', '120'], a: 3, e: '5! = 5×4×3×2×1 = 120.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'How many ways can you arrange 3 distinct books on a shelf?', opts: ['6', '3', '9', '12'], a: 0, e: '3! = 3×2×1 = 6 orderings.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'How many ways to pick 2 people from 5 to form a committee (order does not matter)?', opts: ['20', '10', '25', '15'], a: 1, e: 'C(5,2) = 5!/(2!·3!) = 10.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'How many ways to choose a president then a vice-president from 5 people (order matters)?', opts: ['10', '25', '20', '15'], a: 2, e: 'P(5,2) = 5 × 4 = 20 ordered choices.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'A pizza has 3 toppings to choose freely (each on or off). How many topping combinations?', opts: ['6', '9', '3', '8'], a: 3, e: 'Each topping is independently on/off: 2³ = 8 combinations.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'How many ways to choose 3 items from 10 (order does not matter)?', opts: ['120', '30', '720', '100'], a: 0, e: 'C(10,3) = 10×9×8 / (3×2×1) = 120.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'At a party of 6 people everyone shakes hands once with each other. How many handshakes?', opts: ['12', '15', '30', '36'], a: 1, e: 'C(6,2) = 15 distinct pairs, so 15 handshakes.', tags: ['Algorithms', 'Combinatorics'] },
  { q: 'How many distinct 4-digit PINs are possible using digits 0–9 (repeats allowed)?', opts: ['5040', '4096', '10000', '40320'], a: 2, e: 'Each of 4 positions has 10 choices: 10⁴ = 10000.', tags: ['Algorithms', 'Combinatorics'] },

  // ── Level 4 — Probability ──────────────────────────────────────────────
  { q: 'A randomized retry succeeds independently half the time. What is the probability that exactly the first of two attempts succeeds?', opts: ['1/4', '1/3', '1/2', '1'], a: 0, e: 'The required sequence is success then failure: 1/2 × 1/2 = 1/4.', tags: ['Algorithms', 'Probability'] },
  { q: 'A fair die is rolled. What is the probability of rolling an even number?', opts: ['1/6', '1/2', '1/3', '2/3'], a: 1, e: 'Even results {2,4,6} are 3 of 6 outcomes: 3/6 = 1/2.', tags: ['Algorithms', 'Probability'] },
  { q: 'Two fair coins are flipped. What is the probability of two heads?', opts: ['1/2', '1/3', '1/4', '3/4'], a: 2, e: 'P(HH) = 1/2 × 1/2 = 1/4.', tags: ['Algorithms', 'Probability'] },
  { q: 'A fair die is rolled. What is the probability of NOT rolling a 6?', opts: ['1/6', '1/2', '2/3', '5/6'], a: 3, e: 'Complement rule: 1 − 1/6 = 5/6.', tags: ['Algorithms', 'Probability'] },
  { q: 'A bag has 3 red and 2 blue balls. What is the probability of drawing red?', opts: ['3/5', '2/5', '1/2', '3/2'], a: 0, e: '3 red out of 5 total balls: 3/5.', tags: ['Algorithms', 'Probability'] },
  { q: 'What is the probability of drawing a King from a standard 52-card deck?', opts: ['1/52', '1/13', '1/4', '4/13'], a: 1, e: 'There are 4 Kings: 4/52 = 1/13.', tags: ['Algorithms', 'Probability'] },
  { q: 'Two fair dice are rolled. What is the probability the sum is 7?', opts: ['1/12', '5/36', '1/6', '7/36'], a: 2, e: '6 of 36 pairs sum to 7, so 6/36 = 1/6.', tags: ['Algorithms', 'Probability'] },
  { q: 'Two fair coins are flipped. What is the probability of at least one head?', opts: ['1/4', '1/2', '1', '3/4'], a: 3, e: 'P(at least one) = 1 − P(no heads) = 1 − 1/4 = 3/4.', tags: ['Algorithms', 'Probability'] },

  // ── Level 5 — Prime Numbers & Divisibility ────────────────────────────
  { q: 'Which of these is a prime number?', opts: ['9', '17', '15', '21'], a: 1, e: '17 has no divisors other than 1 and itself; 9=3×3, 15=3×5, 21=3×7.', tags: ['Algorithms', 'Primes'] },
  { q: 'How many prime numbers are there below 20?', opts: ['7', '9', '8', '10'], a: 2, e: 'They are 2,3,5,7,11,13,17,19 — eight primes.', tags: ['Algorithms', 'Primes'] },
  { q: 'What is the greatest common divisor (GCD) of 12 and 18?', opts: ['2', '3', '9', '6'], a: 3, e: 'Common divisors of 12 and 18 are 1,2,3,6; the greatest is 6.', tags: ['Algorithms', 'Divisibility'] },
  { q: 'What is the least common multiple (LCM) of 4 and 6?', opts: ['12', '10', '24', '2'], a: 0, e: 'Multiples of 4 and 6 first meet at 12, so LCM = 12.', tags: ['Algorithms', 'Divisibility'] },
  { q: 'A number is divisible by 3 if:', opts: ['it is even', 'the sum of its digits is divisible by 3', 'its last digit is 0 or 5', 'it ends in 3'], a: 1, e: 'The classic rule: 3 divides a number exactly when 3 divides its digit sum.', tags: ['Algorithms', 'Divisibility'] },
  { q: 'Is 91 a prime number?', opts: ['Yes', 'No, it is 3 × 31', 'No, it is 7 × 13', 'No, it is even'], a: 2, e: '91 = 7 × 13, so it is composite, not prime.', tags: ['Algorithms', 'Primes'] },
  { q: 'What is the GCD of 48 and 36?', opts: ['6', '18', '24', '12'], a: 3, e: '48 = 2⁴×3 and 36 = 2²×3²; shared factors give 2²×3 = 12.', tags: ['Algorithms', 'Divisibility'] },
  { q: 'What is the LCM of 12 and 15?', opts: ['60', '30', '45', '180'], a: 0, e: 'LCM = 12×15 / GCD(12,15) = 180 / 3 = 60.', tags: ['Algorithms', 'Divisibility'] },

  // ── Level 6 — Algebraic Thinking ──────────────────────────────────────
  { q: 'How many times does the loop body run?\n\n```js\nfor (let i = 7; i < 12; i++) work();\n```', opts: ['4', '6', '5', '12'], a: 2, e: 'The loop runs for i = 7, 8, 9, 10, and 11: five iterations.', tags: ['Algorithms', 'Algebra'] },
  { q: 'A binary search halves a sorted set of 100 items after each comparison. What is the maximum number of comparisons needed?', opts: ['6', '8', '100', '7'], a: 3, e: 'ceil(log2(100)) is 7. After seven halvings, the remaining range has at most one item.', tags: ['Algorithms', 'Algebra'] },
  { q: 'How many values does this loop process?\n\n```js\nfor (let i = 7; i < 22; i += 3) work(i);\n```', opts: ['5', '3', '4', '6'], a: 0, e: 'The values are 7, 10, 13, 16, and 19, so the body runs five times.', tags: ['Algorithms', 'Algebra'] },
  { q: 'A batch uses 6 fixed slots plus 2 slots per worker. How many workers fit when the total is 14 slots?', opts: ['2', '4', '5', '7'], a: 1, e: 'Solve 6 + 2w = 14. The remaining 8 slots hold four workers.', tags: ['Algorithms', 'Algebra'] },
  { q: 'Algorithm A performs 5n − 3 operations; B performs 2n + 9. At which input size are the counts equal?', opts: ['3', '5', '4', '6'], a: 2, e: '5n − 3 = 2n + 9 gives 3n = 12, so n = 4.', tags: ['Algorithms', 'Algebra'] },
  { q: 'A worker pool divides 72 independent jobs evenly across three workers. How many jobs does each worker receive?', opts: ['23', '25', '36', '24'], a: 3, e: 'Even distribution gives 72 ÷ 3 = 24 jobs per worker.', tags: ['Algorithms', 'Algebra'] },
  { q: 'An encoded id is calculated as 2n + 5. Which n produced the encoded id 17?', opts: ['6', '5', '7', '11'], a: 0, e: '2n + 5 = 17, so 2n = 12 and n = 6.', tags: ['Algorithms', 'Algebra'] },
  { q: 'Two implementations cost 4n + 1 and 3n + 6 operations. At which n do their estimated costs match?', opts: ['3', '5', '7', '1'], a: 1, e: '4n + 1 = 3n + 6 leaves n = 5.', tags: ['Algorithms', 'Algebra'] },

  // ── Level 7 — Bitwise Logic ───────────────────────────────────────────
  { q: 'What is the binary number 1011 in decimal?', opts: ['9', '13', '7', '11'], a: 3, e: '8 + 0 + 2 + 1 = 11.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is decimal 13 in binary?', opts: ['1101', '1011', '1110', '1001'], a: 0, e: '13 = 8 + 4 + 1 = 1101 in binary.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 5 AND 3 (bitwise)?', opts: ['7', '1', '6', '2'], a: 1, e: '101 AND 011 = 001 = 1.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 5 OR 3 (bitwise)?', opts: ['1', '6', '7', '8'], a: 2, e: '101 OR 011 = 111 = 7.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 5 XOR 3 (bitwise)?', opts: ['1', '7', '2', '6'], a: 3, e: '101 XOR 011 = 110 = 6.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 6 << 1 (left shift by 1)?', opts: ['12', '3', '7', '16'], a: 0, e: 'Left-shifting by 1 doubles the value: 6 × 2 = 12.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 20 >> 2 (right shift by 2)?', opts: ['4', '5', '10', '80'], a: 1, e: 'Right-shifting by 2 divides by 4: 20 ÷ 4 = 5.', tags: ['Algorithms', 'Bitwise'] },
  { q: 'What is 12 XOR 10 (bitwise)?', opts: ['8', '14', '6', '2'], a: 2, e: '1100 XOR 1010 = 0110 = 6.', tags: ['Algorithms', 'Bitwise'] },

  // ── Level 8 — Logic Puzzles ───────────────────────────────────────────
  { q: 'On an island, knights always tell the truth and knaves always lie. A says “I am a knave.” What is A?', opts: ['Impossible — no one can say this', 'A knight', 'A knave', 'Either'], a: 0, e: 'A knight cannot truthfully call itself a knave, and a knave cannot lie by calling itself a knave; the statement is impossible.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'A father is 3 times as old as his son. In 12 years he will be twice as old. How old is the son now?', opts: ['10', '12', '14', '16'], a: 1, e: 'Let son = s: 3s + 12 = 2(s + 12) gives s = 12.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'Anna, Ben and Cara finished a race. Anna beat Ben. Cara finished before Anna. Who came last?', opts: ['Anna', 'Cara', 'Ben', 'Tie'], a: 2, e: 'Order is Cara, Anna, Ben — so Ben came last.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'Two people, one always lies and one always tells the truth, but you do not know who. To find a door, ask either: “Which door would the OTHER guard point to?” Then:', opts: ['take that door', 'ask again', 'you cannot decide', 'take the other door'], a: 3, e: 'Both routes describe the wrong door, so you take the opposite door.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'In a row of 5 seats, Sam is in the middle. Tom is immediately right of Sam. Who is in seat 5 (far right)?', opts: ['someone other than Sam or Tom', 'Sam', 'Tom', 'Nobody'], a: 0, e: 'Sam is in seat 3 and Tom in seat 4, so seat 5 holds one of the other people — not Sam or Tom.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'A says “B is a knave.” B says “A and I are the same type.” On the knight/knave island, what is A?', opts: ['Knave', 'Knight', 'Cannot tell', 'Both lie'], a: 1, e: 'If A is a knave, B is a knight, but then B’s claim of sameness would be a true statement contradicting B being opposite — consistency forces A to be a knight (B a knave).', tags: ['Algorithms', 'Puzzles'] },
  { q: 'Three boxes are labeled Apples, Oranges, Mixed — all labels are wrong. You pick ONE fruit from one box to fix every label. Which box do you pick from?', opts: ['Apples', 'Oranges', 'Mixed', 'Any box works'], a: 2, e: 'The box labeled Mixed must be all one kind; that single fruit reveals it, and since all labels are wrong the rest follow.', tags: ['Algorithms', 'Puzzles'] },
  { q: 'Five people sit in a row. Alice is not at either end. Bob is at the left end. Alice is immediately right of Bob. Which seat is Alice in (1=left)?', opts: ['1', '3', '5', '2'], a: 3, e: 'Bob is seat 1, and Alice is immediately to his right, so Alice is in seat 2.', tags: ['Algorithms', 'Puzzles'] },

  // ── Level 9 — Recurrences & Growth ────────────────────────────────────
  { q: 'Fibonacci is F(n) = F(n-1) + F(n-2) with F(1)=F(2)=1. What is F(7)?', opts: ['8', '13', '21', '11'], a: 1, e: 'Sequence: 1,1,2,3,5,8,13 — the 7th term is 13.', tags: ['Algorithms', 'Recurrences'] },
  { q: 'A bacteria colony doubles every hour. Starting with 1, how many after 10 hours?', opts: ['100', '512', '1024', '20'], a: 2, e: 'Doubling 10 times gives 2¹⁰ = 1024.', tags: ['Algorithms', 'Growth'] },
  { q: 'A lily pad doubles its area daily and covers the pond on day 48. On which day is the pond half covered?', opts: ['24', '36', '46', '47'], a: 3, e: 'If it doubles each day, the day before full (day 47) it is exactly half.', tags: ['Algorithms', 'Growth'] },
  { q: 'Tower of Hanoi needs 2^n − 1 moves for n disks. How many moves for 5 disks?', opts: ['31', '25', '32', '63'], a: 0, e: '2⁵ − 1 = 32 − 1 = 31 moves.', tags: ['Algorithms', 'Recurrences'] },
  { q: 'A sequence is a(n) = 2·a(n-1) + 1 with a(0) = 0. What is a(4)?', opts: ['7', '15', '16', '31'], a: 1, e: 'Terms: 0,1,3,7,15 — so a(4) = 15.', tags: ['Algorithms', 'Recurrences'] },
  { q: 'Linear growth adds 3 per step from 0; exponential doubles from 1. After 6 steps, which is larger and by how much?', opts: ['Linear, by 46', 'They are equal', 'Exponential, by 46', 'Exponential, by 18'], a: 2, e: 'Linear: 18. Exponential: 2⁶ = 64. Exponential leads by 64 − 18 = 46.', tags: ['Algorithms', 'Growth'] },
  { q: '$100 grows at 10% compounded annually. What is the value after 2 years?', opts: ['$120', '$110', '$200', '$121'], a: 3, e: '100 × 1.10² = 100 × 1.21 = $121.', tags: ['Algorithms', 'Growth'] },
  { q: 'The recurrence a(n) = a(n-1) + a(n-2) with a(1)=2, a(2)=2 gives what for a(5)?', opts: ['10', '8', '12', '16'], a: 0, e: 'Terms: 2,2,4,6,10 — so a(5) = 10.', tags: ['Algorithms', 'Recurrences'] },

  // ── Level 10 — Problem Solving ─────────────────────────────────────────
  { q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?', opts: ['$0.10', '$1.00', '$0.05', '$0.01'], a: 2, e: 'If ball = b, then b + (b + 1.00) = 1.10 gives b = $0.05.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'If 5 machines make 5 widgets in 5 minutes, how long do 100 machines take to make 100 widgets?', opts: ['100 minutes', '20 minutes', '1 minute', '5 minutes'], a: 3, e: 'Each machine makes 1 widget in 5 minutes, so 100 machines make 100 widgets in 5 minutes.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'A snail climbs 3 ft up by day and slips 2 ft back each night in a 10 ft well. On which day does it escape?', opts: ['Day 8', 'Day 7', 'Day 10', 'Day 9'], a: 0, e: 'Net +1 ft/day to 7 ft after 7 days; on day 8 it climbs 3 ft to 10 ft and escapes before slipping.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'What is the sum of all integers from 1 to 100?', opts: ['5000', '5050', '10000', '2550'], a: 1, e: 'Gauss’s formula n(n+1)/2 = 100×101/2 = 5050.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'You drive somewhere at 60 mph and return the same route at 40 mph. What is the average speed?', opts: ['50 mph', '45 mph', '48 mph', '52 mph'], a: 2, e: 'Use the harmonic mean: 2×60×40 / (60+40) = 4800/100 = 48 mph.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'A price rises 20% then falls 20%. Compared to the start, the final price is:', opts: ['the same', '4% higher', '20% lower', '4% lower'], a: 3, e: '1.20 × 0.80 = 0.96, a 4% net decrease.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'A clock takes 5 seconds to strike 6 o’clock. How long to strike 12 o’clock?', opts: ['11 s', '10 s', '12 s', '6 s'], a: 0, e: '6 strikes have 5 gaps = 5 s, so 1 s/gap; 12 strikes have 11 gaps = 11 s.', tags: ['Algorithms', 'ProblemSolving'] },
  { q: 'How many total squares (of all sizes) are on a standard 8×8 chessboard?', opts: ['64', '204', '128', '256'], a: 1, e: 'Sum of k² for k=1..8 = 1+4+9+16+25+36+49+64 = 204.', tags: ['Algorithms', 'ProblemSolving'] },
];
