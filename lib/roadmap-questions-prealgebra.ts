// Pre-Algebra roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const preAlgebraSeeds: Seed[] = [
  // ── Level 1 — Integers ──
  { q: 'What is -7 + 3?', opts: ['-4', '-10', '4', '10'], a: 0, e: 'Adding a positive to a negative moves toward zero: -7 + 3 = -4.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is -5 - 8?', opts: ['3', '-3', '-13', '13'], a: 2, e: 'Subtracting 8 from -5 goes further negative: -5 - 8 = -13.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is -6 × -4?', opts: ['-24', '24', '-10', '10'], a: 1, e: 'A negative times a negative is positive: -6 × -4 = 24.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is -20 ÷ 5?', opts: ['4', '-4', '-15', '15'], a: 1, e: 'A negative divided by a positive is negative: -20 ÷ 5 = -4.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is 8 + (-15)?', opts: ['23', '-23', '7', '-7'], a: 3, e: 'Adding -15 to 8 gives 8 - 15 = -7.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is the absolute value |-9|?', opts: ['-9', '9', '0', '18'], a: 1, e: 'Absolute value is the distance from zero, always non-negative: |-9| = 9.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'What is -3 × 7?', opts: ['-21', '21', '-10', '4'], a: 0, e: 'A negative times a positive is negative: -3 × 7 = -21.', tags: ['Pre-Algebra', 'Integers'] },
  { q: 'Which number is the greatest: -5, -1, -8, -3?', opts: ['-5', '-1', '-8', '-3'], a: 1, e: 'On the number line -1 is closest to zero, so it is the greatest.', tags: ['Pre-Algebra', 'Integers'] },

  // ── Level 2 — Exponents & Powers ──
  { q: 'What is 2^3?', opts: ['6', '8', '9', '5'], a: 1, e: '2^3 means 2 × 2 × 2 = 8.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is 5^2?', opts: ['10', '25', '7', '20'], a: 1, e: '5^2 means 5 × 5 = 25.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is (-3)^2?', opts: ['-9', '9', '6', '-6'], a: 1, e: 'Squaring -3 multiplies two negatives: (-3) × (-3) = 9.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is 10^0?', opts: ['0', '1', '10', '100'], a: 1, e: 'Any nonzero number raised to the 0 power equals 1.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is 3^3?', opts: ['9', '27', '6', '12'], a: 1, e: '3^3 means 3 × 3 × 3 = 27.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is 2^5?', opts: ['10', '25', '32', '16'], a: 2, e: '2^5 means 2 × 2 × 2 × 2 × 2 = 32.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is (-2)^3?', opts: ['8', '-8', '6', '-6'], a: 1, e: 'An odd power of a negative stays negative: (-2) × (-2) × (-2) = -8.', tags: ['Pre-Algebra', 'Exponents & Powers'] },
  { q: 'What is 6^2?', opts: ['12', '36', '18', '30'], a: 1, e: '6^2 means 6 × 6 = 36.', tags: ['Pre-Algebra', 'Exponents & Powers'] },

  // ── Level 3 — Square Roots ──
  { q: 'What is √16?', opts: ['4', '8', '2', '16'], a: 0, e: '√16 asks which number squared is 16, and 4 × 4 = 16.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √49?', opts: ['6', '7', '8', '24.5'], a: 1, e: '7 × 7 = 49, so √49 = 7.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √81?', opts: ['9', '8', '18', '40.5'], a: 0, e: '9 × 9 = 81, so √81 = 9.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √100?', opts: ['50', '10', '20', '5'], a: 1, e: '10 × 10 = 100, so √100 = 10.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √64?', opts: ['6', '32', '8', '16'], a: 2, e: '8 × 8 = 64, so √64 = 8.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √144?', opts: ['12', '14', '72', '11'], a: 0, e: '12 × 12 = 144, so √144 = 12.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √25 + √9?', opts: ['8', '34', '16', '4'], a: 0, e: '√25 = 5 and √9 = 3, so 5 + 3 = 8.', tags: ['Pre-Algebra', 'Square Roots'] },
  { q: 'What is √121?', opts: ['10', '12', '11', '60.5'], a: 2, e: '11 × 11 = 121, so √121 = 11.', tags: ['Pre-Algebra', 'Square Roots'] },

  // ── Level 4 — Order of Operations ──
  { q: 'What is 2 + 3 × 4?', opts: ['20', '14', '24', '11'], a: 1, e: 'Multiply before adding: 3 × 4 = 12, then 2 + 12 = 14.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is (2 + 3) × 4?', opts: ['14', '20', '24', '9'], a: 1, e: 'Do the parentheses first: (5) × 4 = 20.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 10 - 2 × 3?', opts: ['24', '4', '8', '6'], a: 1, e: 'Multiply first: 2 × 3 = 6, then 10 - 6 = 4.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 6 + 4 ÷ 2?', opts: ['5', '8', '7', '10'], a: 1, e: 'Divide first: 4 ÷ 2 = 2, then 6 + 2 = 8.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 2^3 + 1?', opts: ['9', '7', '12', '24'], a: 0, e: 'Exponents come first: 2^3 = 8, then 8 + 1 = 9.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 12 ÷ (2 + 4)?', opts: ['10', '2', '4', '8'], a: 1, e: 'Parentheses first: 2 + 4 = 6, then 12 ÷ 6 = 2.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 3 × (4 + 2)^2?', opts: ['108', '324', '48', '40'], a: 0, e: 'Parentheses then exponent: (6)^2 = 36, then 3 × 36 = 108.', tags: ['Pre-Algebra', 'Order of Operations'] },
  { q: 'What is 20 - 3 × 2 + 5?', opts: ['39', '19', '29', '9'], a: 1, e: 'Multiply first: 3 × 2 = 6, then 20 - 6 + 5 = 19.', tags: ['Pre-Algebra', 'Order of Operations'] },

  // ── Level 5 — Variables & Expressions ──
  { q: 'Evaluate 3x when x = 4.', opts: ['7', '12', '34', '1'], a: 1, e: 'Substitute: 3 × 4 = 12.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate x + 5 when x = -2.', opts: ['3', '7', '-3', '-7'], a: 0, e: 'Substitute: -2 + 5 = 3.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate 2x + 1 when x = 3.', opts: ['7', '8', '6', '9'], a: 0, e: 'Substitute: 2 × 3 + 1 = 6 + 1 = 7.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate x^2 when x = 5.', opts: ['10', '25', '7', '55'], a: 1, e: 'Substitute: 5^2 = 5 × 5 = 25.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate 4x - 3 when x = 2.', opts: ['5', '11', '-5', '8'], a: 0, e: 'Substitute: 4 × 2 - 3 = 8 - 3 = 5.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate 5 - x when x = 8.', opts: ['3', '-3', '13', '-13'], a: 1, e: 'Substitute: 5 - 8 = -3.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate 2(x + 3) when x = 4.', opts: ['11', '14', '10', '24'], a: 1, e: 'Substitute inside first: 2(4 + 3) = 2 × 7 = 14.', tags: ['Pre-Algebra', 'Variables & Expressions'] },
  { q: 'Evaluate x/2 + 1 when x = 10.', opts: ['6', '5', '11', '5.5'], a: 0, e: 'Substitute: 10/2 + 1 = 5 + 1 = 6.', tags: ['Pre-Algebra', 'Variables & Expressions'] },

  // ── Level 6 — Simplifying Expressions ──
  { q: 'Simplify 3x + 5x.', opts: ['8x', '15x', '8', '2x'], a: 0, e: 'Combine like terms: 3x + 5x = 8x.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 7x - 2x.', opts: ['5x', '9x', '5', '14x'], a: 0, e: 'Combine like terms: 7x - 2x = 5x.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 2x + 3 + 4x.', opts: ['9x', '6x + 3', '5x + 4', '6x + 7'], a: 1, e: 'Combine the x terms: 2x + 4x = 6x, giving 6x + 3.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 4a + 2b - a.', opts: ['5a + 2b', '3a + 2b', '6ab', '3ab'], a: 1, e: 'Combine the a terms: 4a - a = 3a, giving 3a + 2b.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 3(x + 2).', opts: ['3x + 2', '3x + 6', 'x + 6', '5x'], a: 1, e: 'Distribute the 3: 3 × x + 3 × 2 = 3x + 6.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 2(x - 4) + 5.', opts: ['2x - 3', '2x + 1', '2x - 8', '2x - 9'], a: 0, e: 'Distribute then combine: 2x - 8 + 5 = 2x - 3.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify 5x + 3 - 2x - 1.', opts: ['3x + 2', '7x + 2', '3x + 4', '3x - 2'], a: 0, e: 'Combine like terms: (5x - 2x) + (3 - 1) = 3x + 2.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },
  { q: 'Simplify -(x - 3).', opts: ['-x - 3', '-x + 3', 'x - 3', 'x + 3'], a: 1, e: 'Distribute the negative to both terms: -x + 3.', tags: ['Pre-Algebra', 'Simplifying Expressions'] },

  // ── Level 7 — One-Step Equations ──
  { q: 'Solve x + 5 = 12.', opts: ['7', '17', '60', '5'], a: 0, e: 'Subtract 5 from both sides: x = 12 - 5 = 7.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve x - 4 = 9.', opts: ['5', '13', '36', '-5'], a: 1, e: 'Add 4 to both sides: x = 9 + 4 = 13.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve 3x = 18.', opts: ['15', '21', '6', '54'], a: 2, e: 'Divide both sides by 3: x = 18 ÷ 3 = 6.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve x/4 = 5.', opts: ['20', '9', '1.25', '1'], a: 0, e: 'Multiply both sides by 4: x = 5 × 4 = 20.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve x + 7 = 3.', opts: ['4', '10', '-4', '-10'], a: 2, e: 'Subtract 7 from both sides: x = 3 - 7 = -4.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve 6x = -30.', opts: ['5', '-5', '-24', '-36'], a: 1, e: 'Divide both sides by 6: x = -30 ÷ 6 = -5.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve x - 10 = -2.', opts: ['-12', '8', '12', '-8'], a: 1, e: 'Add 10 to both sides: x = -2 + 10 = 8.', tags: ['Pre-Algebra', 'One-Step Equations'] },
  { q: 'Solve x/3 = -6.', opts: ['-2', '-18', '18', '-9'], a: 1, e: 'Multiply both sides by 3: x = -6 × 3 = -18.', tags: ['Pre-Algebra', 'One-Step Equations'] },

  // ── Level 8 — Two-Step Equations ──
  { q: 'Solve 2x + 3 = 11.', opts: ['4', '7', '5', '3'], a: 0, e: 'Subtract 3 then divide by 2: 2x = 8, so x = 4.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 3x - 5 = 10.', opts: ['15', '5', '3', '45'], a: 1, e: 'Add 5 then divide by 3: 3x = 15, so x = 5.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 5x + 2 = 17.', opts: ['15', '3', '7', '3.8'], a: 1, e: 'Subtract 2 then divide by 5: 5x = 15, so x = 3.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve x/2 + 4 = 10.', opts: ['28', '7', '12', '3'], a: 2, e: 'Subtract 4 then multiply by 2: x/2 = 6, so x = 12.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 4x - 7 = 9.', opts: ['0.5', '16', '4', '2'], a: 2, e: 'Add 7 then divide by 4: 4x = 16, so x = 4.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 2x - 6 = -2.', opts: ['-4', '2', '4', '-2'], a: 1, e: 'Add 6 then divide by 2: 2x = 4, so x = 2.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 3(x + 1) = 12.', opts: ['4', '5', '3', '11'], a: 2, e: 'Divide by 3 then subtract 1: x + 1 = 4, so x = 3.', tags: ['Pre-Algebra', 'Two-Step Equations'] },
  { q: 'Solve 7 - 2x = 1.', opts: ['-3', '4', '3', '-4'], a: 2, e: 'Subtract 7 then divide by -2: -2x = -6, so x = 3.', tags: ['Pre-Algebra', 'Two-Step Equations'] },

  // ── Level 9 — Inequalities ──
  { q: 'Solve x + 3 > 7.', opts: ['x > 4', 'x > 10', 'x < 4', 'x > 21'], a: 0, e: 'Subtract 3 from both sides: x > 4.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve 2x < 10.', opts: ['x < 5', 'x < 20', 'x > 5', 'x < 8'], a: 0, e: 'Divide both sides by 2: x < 5.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve x - 5 ≥ 0.', opts: ['x ≥ 5', 'x ≤ 5', 'x ≥ -5', 'x ≥ 0'], a: 0, e: 'Add 5 to both sides: x ≥ 5.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve -x > 3.', opts: ['x > 3', 'x < -3', 'x > -3', 'x < 3'], a: 1, e: 'Multiply by -1 and flip the sign: x < -3.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve 3x ≤ -9.', opts: ['x ≤ 3', 'x ≥ -3', 'x ≤ -3', 'x ≥ 3'], a: 2, e: 'Divide both sides by 3: x ≤ -3.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Which value satisfies x > 5?', opts: ['4', '5', '6', '3'], a: 2, e: 'Only 6 is strictly greater than 5.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve -2x < 8.', opts: ['x < -4', 'x > -4', 'x < 4', 'x > 4'], a: 1, e: 'Divide by -2 and flip the sign: x > -4.', tags: ['Pre-Algebra', 'Inequalities'] },
  { q: 'Solve 2x + 1 ≥ 7.', opts: ['x ≥ 3', 'x ≥ 4', 'x ≤ 3', 'x ≥ 8'], a: 0, e: 'Subtract 1 then divide by 2: 2x ≥ 6, so x ≥ 3.', tags: ['Pre-Algebra', 'Inequalities'] },

  // ── Level 10 — The Coordinate Plane ──
  { q: 'In which quadrant is the point (3, -2)?', opts: ['I', 'II', 'III', 'IV'], a: 3, e: 'A positive x and negative y place the point in Quadrant IV.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'In which quadrant is the point (-4, 5)?', opts: ['I', 'II', 'III', 'IV'], a: 1, e: 'A negative x and positive y place the point in Quadrant II.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'What are the coordinates of the origin?', opts: ['(0, 0)', '(1, 1)', '(0, 1)', '(1, 0)'], a: 0, e: 'The origin is where the axes meet, at (0, 0).', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'In which quadrant is the point (-3, -6)?', opts: ['I', 'II', 'III', 'IV'], a: 2, e: 'Both coordinates negative place the point in Quadrant III.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'The point (5, 0) lies on which axis?', opts: ['x-axis', 'y-axis', 'the origin', 'Quadrant I'], a: 0, e: 'Since the y-coordinate is 0, the point lies on the x-axis.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'In the point (3, -2), what is the y-coordinate?', opts: ['3', '-2', '2', '-3'], a: 1, e: 'The y-coordinate is the second number in the pair: -2.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'The point (0, -4) lies on which axis?', opts: ['x-axis', 'y-axis', 'the origin', 'Quadrant IV'], a: 1, e: 'Since the x-coordinate is 0, the point lies on the y-axis.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
  { q: 'Starting at the origin, how do you reach the point (-2, 3)?', opts: ['left 2 and up 3', 'right 2 and up 3', 'left 3 and up 2', 'right 2 and down 3'], a: 0, e: 'Negative x means move left 2, positive y means move up 3.', tags: ['Pre-Algebra', 'The Coordinate Plane'] },
];
