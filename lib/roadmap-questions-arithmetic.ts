// Arithmetic roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const arithmeticSeeds: Seed[] = [
  // ── Level 1 — Place Value & Counting ──
  { q: 'What is the value of the digit 7 in the number 372?', opts: ['7', '70', '700', '7000'], a: 1, e: 'The 7 sits in the tens place, so its value is 7 × 10 = 70.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'Which number comes right after 49?', opts: ['40', '48', '50', '59'], a: 2, e: 'Counting up by one from 49 gives 50.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'How many tens are in the number 60?', opts: ['6', '16', '60', '600'], a: 0, e: '60 is made of 6 groups of ten, since 6 × 10 = 60.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'What is the place value of the digit 4 in 5,842?', opts: ['4', '40', '400', '4000'], a: 1, e: 'The 4 is in the tens place, so its value is 40.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'Which number is the largest?', opts: ['312', '321', '132', '231'], a: 1, e: '321 has the greatest hundreds and tens combination, making it the largest.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'What number is made of 3 hundreds, 0 tens, and 5 ones?', opts: ['305', '350', '35', '3005'], a: 0, e: '3 hundreds (300) plus 0 tens plus 5 ones equals 305.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'Count by tens: 10, 20, 30, __, 50. What is the missing number?', opts: ['35', '40', '45', '60'], a: 1, e: 'Adding ten to 30 gives 40, which fits between 30 and 50.', tags: ['Arithmetic', 'Place Value'] },
  { q: 'In the number 8,214, which digit is in the thousands place?', opts: ['8', '2', '1', '4'], a: 0, e: 'The leftmost digit 8 occupies the thousands place.', tags: ['Arithmetic', 'Place Value'] },

  // ── Level 2 — Addition ──
  { q: '7 + 6 = ?', opts: ['12', '13', '14', '15'], a: 1, e: '7 plus 6 equals 13.', tags: ['Arithmetic', 'Addition'] },
  { q: '8 + 5 = ?', opts: ['11', '12', '13', '14'], a: 2, e: '8 plus 5 equals 13.', tags: ['Arithmetic', 'Addition'] },
  { q: '24 + 18 = ?', opts: ['32', '42', '43', '52'], a: 1, e: '24 plus 18 equals 42.', tags: ['Arithmetic', 'Addition'] },
  { q: '45 + 37 = ?', opts: ['72', '81', '82', '92'], a: 2, e: '45 plus 37 equals 82.', tags: ['Arithmetic', 'Addition'] },
  { q: '156 + 27 = ?', opts: ['173', '183', '193', '283'], a: 1, e: '156 plus 27 equals 183.', tags: ['Arithmetic', 'Addition'] },
  { q: '9 + 8 + 7 = ?', opts: ['22', '23', '24', '25'], a: 2, e: '9 + 8 = 17, and 17 + 7 = 24.', tags: ['Arithmetic', 'Addition'] },
  { q: '238 + 145 = ?', opts: ['383', '373', '393', '483'], a: 0, e: '238 plus 145 equals 383.', tags: ['Arithmetic', 'Addition'] },
  { q: '67 + 89 = ?', opts: ['146', '156', '157', '166'], a: 1, e: '67 plus 89 equals 156.', tags: ['Arithmetic', 'Addition'] },

  // ── Level 3 — Subtraction ──
  { q: '15 - 7 = ?', opts: ['6', '7', '8', '9'], a: 2, e: '15 minus 7 equals 8.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '20 - 8 = ?', opts: ['11', '12', '13', '14'], a: 1, e: '20 minus 8 equals 12.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '52 - 27 = ?', opts: ['25', '35', '29', '24'], a: 0, e: '52 minus 27 equals 25.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '83 - 46 = ?', opts: ['37', '36', '47', '43'], a: 0, e: '83 minus 46 equals 37.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '200 - 75 = ?', opts: ['115', '125', '135', '225'], a: 1, e: '200 minus 75 equals 125.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '145 - 68 = ?', opts: ['77', '87', '83', '67'], a: 0, e: '145 minus 68 equals 77.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '500 - 234 = ?', opts: ['256', '266', '276', '366'], a: 1, e: '500 minus 234 equals 266.', tags: ['Arithmetic', 'Subtraction'] },
  { q: '1000 - 456 = ?', opts: ['544', '554', '644', '546'], a: 0, e: '1000 minus 456 equals 544.', tags: ['Arithmetic', 'Subtraction'] },

  // ── Level 4 — Multiplication ──
  { q: '6 × 7 = ?', opts: ['36', '42', '48', '49'], a: 1, e: '6 times 7 equals 42.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '8 × 9 = ?', opts: ['63', '72', '81', '64'], a: 1, e: '8 times 9 equals 72.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '12 × 5 = ?', opts: ['50', '55', '60', '65'], a: 2, e: '12 times 5 equals 60.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '7 × 8 = ?', opts: ['54', '56', '64', '48'], a: 1, e: '7 times 8 equals 56.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '25 × 4 = ?', opts: ['90', '100', '110', '125'], a: 1, e: '25 times 4 equals 100.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '13 × 6 = ?', opts: ['76', '78', '84', '72'], a: 1, e: '13 times 6 equals 78.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '15 × 12 = ?', opts: ['150', '170', '180', '190'], a: 2, e: '15 times 12 equals 180.', tags: ['Arithmetic', 'Multiplication'] },
  { q: '24 × 9 = ?', opts: ['196', '206', '216', '226'], a: 2, e: '24 times 9 equals 216.', tags: ['Arithmetic', 'Multiplication'] },

  // ── Level 5 — Division ──
  { q: '56 ÷ 8 = ?', opts: ['6', '7', '8', '9'], a: 1, e: '56 divided by 8 equals 7, since 8 × 7 = 56.', tags: ['Arithmetic', 'Division'] },
  { q: '72 ÷ 9 = ?', opts: ['6', '7', '8', '9'], a: 2, e: '72 divided by 9 equals 8, since 9 × 8 = 72.', tags: ['Arithmetic', 'Division'] },
  { q: '81 ÷ 9 = ?', opts: ['6', '7', '8', '9'], a: 3, e: '81 divided by 9 equals 9, since 9 × 9 = 81.', tags: ['Arithmetic', 'Division'] },
  { q: '144 ÷ 12 = ?', opts: ['11', '12', '13', '14'], a: 1, e: '144 divided by 12 equals 12, since 12 × 12 = 144.', tags: ['Arithmetic', 'Division'] },
  { q: '96 ÷ 4 = ?', opts: ['22', '24', '26', '28'], a: 1, e: '96 divided by 4 equals 24, since 4 × 24 = 96.', tags: ['Arithmetic', 'Division'] },
  { q: '63 ÷ 7 = ?', opts: ['6', '7', '8', '9'], a: 3, e: '63 divided by 7 equals 9, since 7 × 9 = 63.', tags: ['Arithmetic', 'Division'] },
  { q: '128 ÷ 8 = ?', opts: ['14', '16', '18', '12'], a: 1, e: '128 divided by 8 equals 16, since 8 × 16 = 128.', tags: ['Arithmetic', 'Division'] },
  { q: '91 ÷ 7 = ?', opts: ['11', '12', '13', '14'], a: 2, e: '91 divided by 7 equals 13, since 7 × 13 = 91.', tags: ['Arithmetic', 'Division'] },

  // ── Level 6 — Order of Operations ──
  { q: '2 + 3 × 4 = ?', opts: ['20', '14', '24', '11'], a: 1, e: 'Multiply first: 3 × 4 = 12, then 2 + 12 = 14.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '(5 + 3) × 2 = ?', opts: ['16', '13', '11', '10'], a: 0, e: 'Do the parentheses first: 5 + 3 = 8, then 8 × 2 = 16.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '10 - 6 ÷ 2 = ?', opts: ['2', '7', '8', '4'], a: 1, e: 'Divide first: 6 ÷ 2 = 3, then 10 - 3 = 7.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '4 × 3 + 5 × 2 = ?', opts: ['22', '34', '26', '20'], a: 0, e: 'Multiply first: 12 and 10, then add to get 22.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '2^3 + 1 = ?', opts: ['7', '9', '8', '6'], a: 1, e: 'Evaluate the exponent first: 2^3 = 8, then 8 + 1 = 9.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '12 ÷ (2 + 4) = ?', opts: ['2', '4', '6', '8'], a: 0, e: 'Parentheses first: 2 + 4 = 6, then 12 ÷ 6 = 2.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '20 - 2 × 3^2 = ?', opts: ['2', '162', '18', '6'], a: 0, e: 'Exponent first (3^2 = 9), then 2 × 9 = 18, then 20 - 18 = 2.', tags: ['Arithmetic', 'Order of Operations'] },
  { q: '(6 + 2) × (5 - 3) = ?', opts: ['14', '16', '20', '10'], a: 1, e: 'Each parentheses first: 8 and 2, then 8 × 2 = 16.', tags: ['Arithmetic', 'Order of Operations'] },

  // ── Level 7 — Factors & Multiples ──
  { q: 'Which number is a factor of 12?', opts: ['5', '7', '4', '8'], a: 2, e: '4 divides 12 evenly (12 ÷ 4 = 3), so it is a factor.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'What is the greatest common factor of 8 and 12?', opts: ['2', '4', '6', '8'], a: 1, e: 'The largest number dividing both 8 and 12 is 4.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'Which number is a multiple of 7?', opts: ['21', '25', '30', '15'], a: 0, e: '21 = 7 × 3, so it is a multiple of 7.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'What is the least common multiple of 4 and 6?', opts: ['10', '12', '24', '8'], a: 1, e: '12 is the smallest number that both 4 and 6 divide evenly.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'How many factors does 6 have?', opts: ['2', '3', '4', '6'], a: 2, e: 'The factors of 6 are 1, 2, 3, and 6 — a total of 4.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'Which of these numbers is prime?', opts: ['9', '15', '17', '21'], a: 2, e: '17 has no divisors other than 1 and itself, so it is prime.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'What is the greatest common factor of 18 and 24?', opts: ['3', '6', '9', '12'], a: 1, e: 'The largest number dividing both 18 and 24 is 6.', tags: ['Arithmetic', 'Factors & Multiples'] },
  { q: 'What is the least common multiple of 3 and 5?', opts: ['8', '15', '30', '5'], a: 1, e: '15 is the smallest number divisible by both 3 and 5.', tags: ['Arithmetic', 'Factors & Multiples'] },

  // ── Level 8 — Rounding & Estimation ──
  { q: 'Round 47 to the nearest ten.', opts: ['40', '45', '50', '47'], a: 2, e: 'Since the ones digit is 7 (5 or more), round up to 50.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Round 152 to the nearest hundred.', opts: ['100', '150', '200', '160'], a: 2, e: 'The tens digit is 5, so round up to 200.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Round 3,847 to the nearest thousand.', opts: ['3000', '3800', '4000', '3900'], a: 2, e: 'The hundreds digit is 8 (5 or more), so round up to 4000.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Estimate 48 + 53 by rounding each number to the nearest ten.', opts: ['90', '100', '110', '80'], a: 1, e: '48 rounds to 50 and 53 rounds to 50, giving an estimate of 100.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Round 2,459 to the nearest hundred.', opts: ['2400', '2500', '2000', '2460'], a: 1, e: 'The tens digit is 5, so the hundreds place rounds up to 2500.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Estimate 312 - 198 by rounding each number to the nearest hundred.', opts: ['100', '200', '114', '150'], a: 0, e: '312 rounds to 300 and 198 rounds to 200, giving 300 - 200 = 100.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Round 6.7 to the nearest whole number.', opts: ['6', '7', '6.5', '8'], a: 1, e: 'The decimal .7 is 5 or more, so round up to 7.', tags: ['Arithmetic', 'Rounding & Estimation'] },
  { q: 'Estimate 19 × 21 by rounding each number to the nearest ten.', opts: ['400', '380', '420', '399'], a: 0, e: '19 rounds to 20 and 21 rounds to 20, giving 20 × 20 = 400.', tags: ['Arithmetic', 'Rounding & Estimation'] },

  // ── Level 9 — Negative Numbers ──
  { q: '-5 + 8 = ?', opts: ['-3', '3', '13', '-13'], a: 1, e: 'Adding 8 to -5 moves 8 to the right on the number line, reaching 3.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '3 - 7 = ?', opts: ['4', '-4', '-10', '10'], a: 1, e: 'Subtracting 7 from 3 drops below zero to -4.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '-6 + (-4) = ?', opts: ['-10', '10', '-2', '2'], a: 0, e: 'Two negatives add in size and stay negative: -6 - 4 = -10.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '-8 - 5 = ?', opts: ['-3', '-13', '13', '3'], a: 1, e: 'Subtracting 5 from -8 moves further negative to -13.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '-4 × 3 = ?', opts: ['12', '-12', '-7', '7'], a: 1, e: 'A negative times a positive is negative: -4 × 3 = -12.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '-15 ÷ 3 = ?', opts: ['5', '-5', '-45', '45'], a: 1, e: 'A negative divided by a positive is negative: -15 ÷ 3 = -5.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: '-7 × -2 = ?', opts: ['-14', '14', '-9', '9'], a: 1, e: 'A negative times a negative is positive: -7 × -2 = 14.', tags: ['Arithmetic', 'Negative Numbers'] },
  { q: 'What is the value of 5 - (-3)?', opts: ['2', '8', '-8', '-2'], a: 1, e: 'Subtracting a negative adds: 5 - (-3) = 5 + 3 = 8.', tags: ['Arithmetic', 'Negative Numbers'] },

  // ── Level 10 — Word Problems ──
  { q: 'A store sells notebooks for $4 each. Lena buys 5 and pays with a $50 bill. How much change does she get?', opts: ['$20', '$25', '$30', '$35'], a: 2, e: '5 notebooks cost 5 × $4 = $20, and $50 - $20 = $30 in change.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'A bus has 8 rows with 4 seats in each row. If 26 seats are taken, how many seats are empty?', opts: ['6', '8', '5', '7'], a: 0, e: 'Total seats are 8 × 4 = 32, and 32 - 26 = 6 empty.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'Tom saves $7 each week. How much will he have saved after 6 weeks?', opts: ['$36', '$42', '$48', '$49'], a: 1, e: 'Saving $7 for 6 weeks gives 7 × 6 = $42.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'Three friends split a $60 restaurant bill equally. How much does each person pay?', opts: ['$15', '$20', '$25', '$30'], a: 1, e: 'Dividing $60 among 3 people gives 60 ÷ 3 = $20 each.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'A recipe needs 3 eggs per cake. If you bake 5 cakes and already have 4 eggs, how many more eggs do you need?', opts: ['11', '15', '19', '7'], a: 0, e: 'You need 5 × 3 = 15 eggs, and 15 - 4 = 11 more.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'A car travels at 60 miles per hour for 2.5 hours. How far does it go?', opts: ['120 miles', '150 miles', '180 miles', '125 miles'], a: 1, e: 'Distance is speed × time: 60 × 2.5 = 150 miles.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'Maria buys 4 notebooks at $3 each and 2 pens at $2 each. What is her total cost?', opts: ['$14', '$16', '$18', '$20'], a: 1, e: 'Notebooks cost 4 × $3 = $12 and pens 2 × $2 = $4, totaling $16.', tags: ['Arithmetic', 'Word Problems'] },
  { q: 'A baker makes 120 cookies and packs them into boxes of 12. If he sells 6 boxes, how many boxes remain?', opts: ['4', '5', '6', '10'], a: 0, e: '120 ÷ 12 = 10 boxes, and 10 - 6 = 4 boxes remain.', tags: ['Arithmetic', 'Word Problems'] },
];
