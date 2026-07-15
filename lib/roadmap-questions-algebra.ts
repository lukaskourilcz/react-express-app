// Algebra roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const algebraSeeds: Seed[] = [
  // ── Level 1 — Linear Equations ──
  { q: 'Solve for x: x + 5 = 12', opts: ['5', '7', '17', '6'], a: 1, e: 'Subtract 5 from both sides: x = 12 - 5 = 7.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: 3x = 21', opts: ['6', '18', '7', '24'], a: 2, e: 'Divide both sides by 3: x = 21 / 3 = 7.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: x - 4 = 10', opts: ['14', '6', '40', '2.5'], a: 0, e: 'Add 4 to both sides: x = 10 + 4 = 14.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: 3x + 2 = 11', opts: ['3', '4', '2', '5'], a: 0, e: 'Subtract 2 to get 3x = 9, then divide by 3: x = 3.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: x/2 = 6', opts: ['3', '8', '12', '4'], a: 2, e: 'Multiply both sides by 2: x = 6 × 2 = 12.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: 2x - 7 = 3', opts: ['5', '2', '-2', '10'], a: 0, e: 'Add 7 to get 2x = 10, then divide by 2: x = 5.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: 5x + 3 = 2x + 12', opts: ['3', '5', '2', '9'], a: 0, e: 'Subtract 2x and 3: 3x = 9, so x = 3.', tags: ['Algebra', 'Linear Equations'] },
  { q: 'Solve for x: 4(x - 1) = 20', opts: ['4', '6', '5', '21'], a: 1, e: 'Divide by 4 to get x - 1 = 5, then add 1: x = 6.', tags: ['Algebra', 'Linear Equations'] },

  // ── Level 2 — Slope & Lines ──
  { q: 'What is the slope of the line y = 2x + 1?', opts: ['1', '2', '-2', '1/2'], a: 1, e: 'In slope-intercept form y = mx + b, the coefficient of x is the slope, so m = 2.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'What is the y-intercept of the line y = 3x - 4?', opts: ['3', '4', '-4', '0'], a: 2, e: 'In y = mx + b the constant b is the y-intercept, so b = -4.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'What is the slope of the line through (1, 2) and (3, 6)?', opts: ['2', '1/2', '4', '3'], a: 0, e: 'Slope = (6 - 2)/(3 - 1) = 4/2 = 2.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'What is the slope of the line through (0, 1) and (2, 5)?', opts: ['3', '2', '1', '4'], a: 1, e: 'Slope = (5 - 1)/(2 - 0) = 4/2 = 2.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'A horizontal line has what slope?', opts: ['1', 'undefined', '0', '-1'], a: 2, e: 'Horizontal lines have no vertical change, so the slope is 0.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'What is the slope of a line perpendicular to y = 2x + 3?', opts: ['2', '-2', '1/2', '-1/2'], a: 3, e: 'Perpendicular slopes are negative reciprocals, so the slope is -1/2.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'Which line is parallel to y = 3x + 1?', opts: ['y = -3x + 1', 'y = 3x - 5', 'y = (1/3)x + 1', 'y = x + 3'], a: 1, e: 'Parallel lines have equal slopes, and y = 3x - 5 also has slope 3.', tags: ['Algebra', 'Slope & Lines'] },
  { q: 'Write the equation of the line with slope 4 passing through (0, -2).', opts: ['y = 4x - 2', 'y = -2x + 4', 'y = 4x + 2', 'y = 2x - 4'], a: 0, e: 'With slope m = 4 and y-intercept b = -2, the equation is y = 4x - 2.', tags: ['Algebra', 'Slope & Lines'] },

  // ── Level 3 — Systems of Equations ──
  { q: 'Solve the system: x + y = 10, x - y = 4. What is x?', opts: ['7', '6', '3', '5'], a: 0, e: 'Adding the equations gives 2x = 14, so x = 7.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve the system: x + y = 10, x - y = 4. What is y?', opts: ['7', '3', '4', '6'], a: 1, e: 'From x = 7 and x + y = 10, y = 10 - 7 = 3.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve: y = 2x, x + y = 9. What is x?', opts: ['2', '4', '3', '6'], a: 2, e: 'Substitute: x + 2x = 9, so 3x = 9 and x = 3.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve: y = x + 1, y = 2x - 3. What is x?', opts: ['4', '2', '5', '3'], a: 0, e: 'Set equal: x + 1 = 2x - 3, so x = 4.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve: 2x + y = 7, y = 3. What is x?', opts: ['1', '2', '3', '4'], a: 1, e: 'Substitute y = 3: 2x + 3 = 7, so 2x = 4 and x = 2.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve: x + 2y = 8, x = 2. What is y?', opts: ['2', '4', '3', '1'], a: 2, e: 'Substitute x = 2: 2 + 2y = 8, so 2y = 6 and y = 3.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'Solve: 3x + 2y = 12, x - 2y = 4. What is x?', opts: ['4', '3', '5', '2'], a: 0, e: 'Adding eliminates y: 4x = 16, so x = 4.', tags: ['Algebra', 'Systems of Equations'] },
  { q: 'How many solutions does the system y = 2x + 1, y = 2x - 3 have?', opts: ['One', 'Infinitely many', 'None', 'Two'], a: 2, e: 'The lines have equal slopes but different intercepts, so they are parallel and never intersect.', tags: ['Algebra', 'Systems of Equations'] },

  // ── Level 4 — Polynomials ──
  { q: 'Simplify: (2x + 3) + (x + 4)', opts: ['3x + 7', '2x + 7', '3x + 12', '2x + 12'], a: 0, e: 'Combine like terms: (2x + x) + (3 + 4) = 3x + 7.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Simplify: (5x - 2) - (2x + 3)', opts: ['3x + 1', '3x - 5', '7x - 5', '3x - 1'], a: 1, e: 'Distribute the minus: 5x - 2 - 2x - 3 = 3x - 5.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Multiply: 3x(x + 2)', opts: ['3x^2 + 6x', '3x^2 + 2', '3x + 6', '4x^2 + 6x'], a: 0, e: 'Distribute: 3x·x + 3x·2 = 3x^2 + 6x.', tags: ['Algebra', 'Polynomials'] },
  { q: 'What is the degree of the polynomial 4x^3 - 2x + 7?', opts: ['1', '7', '3', '4'], a: 2, e: 'The degree is the highest exponent, which is 3.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Expand: (x + 2)(x + 3)', opts: ['x^2 + 5x + 6', 'x^2 + 6x + 5', 'x^2 + 5x + 5', 'x^2 + 6x + 6'], a: 0, e: 'FOIL: x^2 + 3x + 2x + 6 = x^2 + 5x + 6.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Expand: (x + 4)(x - 2)', opts: ['x^2 + 2x - 8', 'x^2 - 2x - 8', 'x^2 + 2x + 8', 'x^2 + 6x - 8'], a: 0, e: 'FOIL: x^2 - 2x + 4x - 8 = x^2 + 2x - 8.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Simplify: 2x^2 + 3x - x^2 + 5x', opts: ['x^2 + 8x', '3x^2 + 8x', 'x^2 + 2x', '2x^2 + 8x'], a: 0, e: 'Combine like terms: (2x^2 - x^2) + (3x + 5x) = x^2 + 8x.', tags: ['Algebra', 'Polynomials'] },
  { q: 'Expand: (x - 5)^2', opts: ['x^2 - 25', 'x^2 - 10x + 25', 'x^2 + 10x + 25', 'x^2 - 10x - 25'], a: 1, e: 'Square a binomial: x^2 - 2(5)x + 25 = x^2 - 10x + 25.', tags: ['Algebra', 'Polynomials'] },

  // ── Level 5 — Factoring ──
  { q: 'Factor: x^2 + 5x + 6', opts: ['(x + 2)(x + 3)', '(x + 1)(x + 6)', '(x - 2)(x - 3)', '(x + 5)(x + 1)'], a: 0, e: 'Find two numbers multiplying to 6 and adding to 5: 2 and 3, giving (x + 2)(x + 3).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: x^2 - 5x + 6', opts: ['(x + 2)(x + 3)', '(x - 1)(x - 6)', '(x - 2)(x - 3)', '(x - 2)(x + 3)'], a: 2, e: 'Two numbers multiplying to 6 and adding to -5 are -2 and -3, giving (x - 2)(x - 3).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: x^2 - 9', opts: ['(x - 3)(x - 3)', '(x + 3)(x + 3)', '(x - 3)(x + 3)', '(x - 9)(x + 1)'], a: 2, e: 'This is a difference of squares: x^2 - 9 = (x - 3)(x + 3).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: x^2 + 7x + 12', opts: ['(x + 3)(x + 4)', '(x + 2)(x + 6)', '(x + 1)(x + 12)', '(x - 3)(x - 4)'], a: 0, e: 'Two numbers multiplying to 12 and adding to 7 are 3 and 4, giving (x + 3)(x + 4).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor out the GCF: 6x^2 + 9x', opts: ['3x(2x + 3)', '3(2x^2 + 3x)', 'x(6x + 9)', '6x(x + 3)'], a: 0, e: 'The greatest common factor is 3x: 6x^2 + 9x = 3x(2x + 3).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: x^2 - x - 12', opts: ['(x - 4)(x + 3)', '(x + 4)(x - 3)', '(x - 4)(x - 3)', '(x - 6)(x + 2)'], a: 0, e: 'Two numbers multiplying to -12 and adding to -1 are -4 and 3, giving (x - 4)(x + 3).', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: 2x^2 + 7x + 3', opts: ['(2x + 3)(x + 1)', '(2x + 1)(x + 3)', '(2x + 3)(x + 3)', '(x + 1)(x + 3)'], a: 1, e: 'Expanding (2x + 1)(x + 3) gives 2x^2 + 6x + x + 3 = 2x^2 + 7x + 3.', tags: ['Algebra', 'Factoring'] },
  { q: 'Factor: x^2 - 16', opts: ['(x - 4)(x - 4)', '(x - 4)(x + 4)', '(x - 8)(x + 2)', '(x + 4)(x + 4)'], a: 1, e: 'Difference of squares: x^2 - 16 = (x - 4)(x + 4).', tags: ['Algebra', 'Factoring'] },

  // ── Level 6 — Quadratic Equations ──
  { q: 'Solve: x^2 = 25', opts: ['5 only', '-5 only', '5 or -5', '12.5'], a: 2, e: 'Taking the square root gives both x = 5 and x = -5.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 - 4 = 0', opts: ['x = 2 or x = -2', 'x = 4', 'x = 2 only', 'x = -4 or x = 4'], a: 0, e: 'Factor as (x - 2)(x + 2) = 0, giving x = 2 or x = -2.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 - 5x + 6 = 0', opts: ['x = 2 or x = 3', 'x = -2 or x = -3', 'x = 1 or x = 6', 'x = 5 or x = 6'], a: 0, e: 'Factor as (x - 2)(x - 3) = 0, giving x = 2 or x = 3.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 + 5x + 6 = 0', opts: ['x = 2 or x = 3', 'x = -2 or x = -3', 'x = -1 or x = -6', 'x = 2 or x = -3'], a: 1, e: 'Factor as (x + 2)(x + 3) = 0, giving x = -2 or x = -3.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 - 7x + 12 = 0', opts: ['x = 3 or x = 4', 'x = -3 or x = -4', 'x = 2 or x = 6', 'x = 1 or x = 12'], a: 0, e: 'Factor as (x - 3)(x - 4) = 0, giving x = 3 or x = 4.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 = 9x', opts: ['x = 9 only', 'x = 0 or x = 9', 'x = 3 or x = -3', 'x = 0 only'], a: 1, e: 'Rewrite as x^2 - 9x = 0, factor x(x - 9) = 0, giving x = 0 or x = 9.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'Solve: x^2 - 2x - 8 = 0', opts: ['x = 4 or x = -2', 'x = -4 or x = 2', 'x = 4 or x = 2', 'x = 8 or x = -1'], a: 0, e: 'Factor as (x - 4)(x + 2) = 0, giving x = 4 or x = -2.', tags: ['Algebra', 'Quadratic Equations'] },
  { q: 'How many real solutions does x^2 + 4 = 0 have?', opts: ['One', 'Two', 'Zero', 'Infinitely many'], a: 2, e: 'x^2 = -4 has no real solution since a square cannot be negative.', tags: ['Algebra', 'Quadratic Equations'] },

  // ── Level 7 — The Quadratic Formula ──
  { q: 'In the quadratic formula, what is the discriminant?', opts: ['b^2 - 4ac', 'b^2 + 4ac', '-b ± √(b^2 - 4ac)', '2a'], a: 0, e: 'The discriminant is the expression b^2 - 4ac under the square root.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'For x^2 - 5x + 6 = 0, what is the discriminant?', opts: ['1', '49', '-1', '5'], a: 0, e: 'b^2 - 4ac = (-5)^2 - 4(1)(6) = 25 - 24 = 1.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'Using the quadratic formula, solve x^2 - 3x + 2 = 0.', opts: ['x = 1 or x = 2', 'x = -1 or x = -2', 'x = 3 or x = 2', 'x = 1 or x = 3'], a: 0, e: 'x = (3 ± √(9 - 8))/2 = (3 ± 1)/2, giving x = 2 or x = 1.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'If the discriminant is 0, how many real solutions are there?', opts: ['Zero', 'One', 'Two', 'Infinitely many'], a: 1, e: 'A discriminant of 0 gives exactly one repeated real solution.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'If the discriminant is negative, how many real solutions are there?', opts: ['Zero', 'One', 'Two', 'Three'], a: 0, e: 'A negative discriminant means the square root is imaginary, so there are no real solutions.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'For 2x^2 + 3x - 2 = 0, what is the discriminant?', opts: ['25', '1', '-7', '17'], a: 0, e: 'b^2 - 4ac = 3^2 - 4(2)(-2) = 9 + 16 = 25.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'Solve 2x^2 + 3x - 2 = 0 using the quadratic formula.', opts: ['x = 1/2 or x = -2', 'x = -1/2 or x = 2', 'x = 2 or x = -1', 'x = 1 or x = -2'], a: 0, e: 'x = (-3 ± 5)/4, giving x = 2/4 = 1/2 or x = -8/4 = -2.', tags: ['Algebra', 'The Quadratic Formula'] },
  { q: 'For x^2 + 2x + 5 = 0, what does the discriminant tell you?', opts: ['Two real roots', 'One real root', 'No real roots', 'Three real roots'], a: 2, e: 'b^2 - 4ac = 4 - 20 = -16, which is negative, so there are no real roots.', tags: ['Algebra', 'The Quadratic Formula'] },

  // ── Level 8 — Functions ──
  { q: 'If f(x) = 2x + 1, what is f(3)?', opts: ['6', '7', '5', '9'], a: 1, e: 'Substitute x = 3: f(3) = 2(3) + 1 = 7.', tags: ['Algebra', 'Functions'] },
  { q: 'If f(x) = x^2 - 1, what is f(4)?', opts: ['15', '7', '16', '17'], a: 0, e: 'Substitute x = 4: f(4) = 16 - 1 = 15.', tags: ['Algebra', 'Functions'] },
  { q: 'If f(x) = 3x - 2, for what x is f(x) = 10?', opts: ['4', '3', '6', '2'], a: 0, e: 'Solve 3x - 2 = 10: 3x = 12, so x = 4.', tags: ['Algebra', 'Functions'] },
  { q: 'What is the domain of f(x) = 1/x?', opts: ['All real numbers', 'All real numbers except 0', 'x > 0 only', 'x ≥ 0'], a: 1, e: 'Division by zero is undefined, so x cannot equal 0.', tags: ['Algebra', 'Functions'] },
  { q: 'If f(x) = x + 2 and g(x) = 3x, what is f(g(2))?', opts: ['8', '6', '12', '10'], a: 0, e: 'First g(2) = 6, then f(6) = 6 + 2 = 8.', tags: ['Algebra', 'Functions'] },
  { q: 'If f(x) = 5, what kind of function is this?', opts: ['Linear with nonzero slope', 'Constant', 'Quadratic', 'Exponential'], a: 1, e: 'A function that always outputs the same value is a constant function.', tags: ['Algebra', 'Functions'] },
  { q: 'If f(x) = 2x, what is the inverse function f⁻¹(x)?', opts: ['x/2', '2x', '-2x', 'x - 2'], a: 0, e: 'Swap and solve y = 2x gives x = 2y, so f⁻¹(x) = x/2.', tags: ['Algebra', 'Functions'] },
  { q: 'Which relation is NOT a function?', opts: ['y = x^2', 'y = 2x + 1', 'x = y^2', 'y = |x|'], a: 2, e: 'x = y^2 assigns two y-values to one x, failing the vertical line test.', tags: ['Algebra', 'Functions'] },

  // ── Level 9 — Exponents & Radicals ──
  { q: 'Simplify: x^3 · x^4', opts: ['x^7', 'x^12', 'x^1', '2x^7'], a: 0, e: 'When multiplying powers with the same base, add exponents: x^(3+4) = x^7.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'Simplify: x^6 / x^2', opts: ['x^3', 'x^4', 'x^8', 'x^12'], a: 1, e: 'When dividing powers with the same base, subtract exponents: x^(6-2) = x^4.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'Simplify: (x^2)^3', opts: ['x^5', 'x^8', 'x^6', 'x^9'], a: 2, e: 'When raising a power to a power, multiply exponents: x^(2·3) = x^6.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'What is x^0 (for x ≠ 0)?', opts: ['0', '1', 'x', 'undefined'], a: 1, e: 'Any nonzero number raised to the power 0 equals 1.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'Simplify: √(16)', opts: ['4', '8', '256', '2'], a: 0, e: 'The square root of 16 is 4 since 4 × 4 = 16.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'What is x^(-2) written with a positive exponent?', opts: ['-x^2', '1/x^2', 'x^2', '2/x'], a: 1, e: 'A negative exponent means the reciprocal: x^(-2) = 1/x^2.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'Simplify: √(50)', opts: ['5√2', '2√5', '25√2', '5√10'], a: 0, e: 'Since 50 = 25 × 2, √50 = √25 · √2 = 5√2.', tags: ['Algebra', 'Exponents & Radicals'] },
  { q: 'What is 9^(1/2)?', opts: ['81', '4.5', '3', '18'], a: 2, e: 'A fractional exponent of 1/2 means the square root, so 9^(1/2) = √9 = 3.', tags: ['Algebra', 'Exponents & Radicals'] },

  // ── Level 10 — Rational Expressions ──
  { q: 'Simplify: (x^2)/(x)', opts: ['x', 'x^2', '1', 'x^3'], a: 0, e: 'Cancel one x from top and bottom: x^2/x = x.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Simplify: (2x + 4)/2', opts: ['x + 4', 'x + 2', '2x + 2', 'x + 1'], a: 1, e: 'Divide each term by 2: (2x)/2 + 4/2 = x + 2.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Simplify: (x^2 - 9)/(x - 3)', opts: ['x - 3', 'x + 3', 'x^2', 'x - 9'], a: 1, e: 'Factor the top as (x - 3)(x + 3) and cancel (x - 3), leaving x + 3.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Add: 1/x + 2/x', opts: ['3/x', '3/(2x)', '2/x^2', '3/x^2'], a: 0, e: 'With a common denominator, add the numerators: (1 + 2)/x = 3/x.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Simplify: (x^2 + 5x + 6)/(x + 2)', opts: ['x + 3', 'x + 2', 'x + 6', 'x - 3'], a: 0, e: 'Factor the top as (x + 2)(x + 3) and cancel (x + 2), leaving x + 3.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Multiply: (2/x) · (x/3)', opts: ['2/3', '2x/3', '2/(3x)', '6/x'], a: 0, e: 'Multiply numerators and denominators: 2x/(3x) = 2/3 after canceling x.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'For what value of x is (x + 1)/(x - 4) undefined?', opts: ['x = -1', 'x = 4', 'x = 1', 'x = 0'], a: 1, e: 'The expression is undefined when the denominator is 0, which is at x = 4.', tags: ['Algebra', 'Rational Expressions'] },
  { q: 'Divide: (x/2) ÷ (x/6)', opts: ['3', '1/3', 'x^2/12', '12'], a: 0, e: 'Dividing by a fraction multiplies by its reciprocal: (x/2)·(6/x) = 6x/(2x) = 3.', tags: ['Algebra', 'Rational Expressions'] },
];
