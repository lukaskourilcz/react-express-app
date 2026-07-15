// Pre-Calculus roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const preCalculusSeeds: Seed[] = [
  // ── Level 1 — Function Notation ──
  { q: 'If f(x) = 2x + 1, what is f(3)?', opts: ['7', '6', '5', '9'], a: 0, e: 'f(3) = 2(3) + 1 = 6 + 1 = 7.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If f(x) = x^2 - 4, what is f(2)?', opts: ['4', '0', '8', '-4'], a: 1, e: 'f(2) = 2^2 - 4 = 4 - 4 = 0.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If f(x) = 3x - 5, what is f(0)?', opts: ['0', '5', '-5', '-2'], a: 2, e: 'f(0) = 3(0) - 5 = -5.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If g(x) = x^2 + 1, what is g(-2)?', opts: ['3', '-3', '-5', '5'], a: 3, e: 'g(-2) = (-2)^2 + 1 = 4 + 1 = 5.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If f(x) = 5 - 2x, what is f(4)?', opts: ['-3', '3', '13', '-13'], a: 0, e: 'f(4) = 5 - 2(4) = 5 - 8 = -3.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If h(x) = x^3, what is h(-2)?', opts: ['8', '-6', '-8', '6'], a: 2, e: 'h(-2) = (-2)^3 = -8.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If f(x) = |x - 3|, what is f(1)?', opts: ['-2', '4', '2', '1'], a: 2, e: 'f(1) = |1 - 3| = |-2| = 2.', tags: ['Pre-Calculus', 'Function Notation'] },
  { q: 'If f(x) = 2x^2 - x, what is f(3)?', opts: ['15', '12', '21', '9'], a: 0, e: 'f(3) = 2(9) - 3 = 18 - 3 = 15.', tags: ['Pre-Calculus', 'Function Notation'] },

  // ── Level 2 — Domain & Range ──
  { q: 'What is the domain of f(x) = 1/(x - 2)?', opts: ['All reals except x = 2', 'All reals except x = 0', 'x > 2', 'All reals'], a: 0, e: 'The denominator x - 2 cannot equal 0, so x = 2 is excluded.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the domain of f(x) = √(x - 3)?', opts: ['x > 3', 'x ≤ 3', 'x ≥ 3', 'x ≥ 0'], a: 2, e: 'The radicand must be non-negative: x - 3 ≥ 0, so x ≥ 3.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the range of f(x) = x^2?', opts: ['y > 0', 'y ≥ 0', 'all reals', 'y ≤ 0'], a: 1, e: 'A square is never negative, so the outputs are y ≥ 0.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the domain of f(x) = √x?', opts: ['x > 0', 'all reals', 'x ≥ 0', 'x ≤ 0'], a: 2, e: 'The radicand must be non-negative, so x ≥ 0.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the range of f(x) = |x|?', opts: ['all reals', 'y ≤ 0', 'y > 0', 'y ≥ 0'], a: 3, e: 'Absolute value outputs are never negative, so y ≥ 0.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the domain of f(x) = 1/(x^2 - 9)?', opts: ['all reals', 'except x = 3', 'except x = 9', 'except x = ±3'], a: 3, e: 'x^2 - 9 = 0 when x = 3 or x = -3, so both are excluded.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the range of f(x) = x^2 + 2?', opts: ['y ≥ 0', 'y ≥ 2', 'y > 2', 'all reals'], a: 1, e: 'The minimum of x^2 is 0, so x^2 + 2 has minimum 2, giving y ≥ 2.', tags: ['Pre-Calculus', 'Domain & Range'] },
  { q: 'What is the domain of f(x) = (x + 1)/(x^2 + 1)?', opts: ['except x = -1', 'except x = 1', 'all reals', 'x ≥ 0'], a: 2, e: 'x^2 + 1 is always positive, so it is never zero and the domain is all reals.', tags: ['Pre-Calculus', 'Domain & Range'] },

  // ── Level 3 — Transformations of Functions ──
  { q: 'How does the graph of f(x) + 3 compare to f(x)?', opts: ['shifts up 3', 'shifts down 3', 'shifts right 3', 'shifts left 3'], a: 0, e: 'Adding a constant outside the function shifts the graph up by 3.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'How does the graph of f(x - 2) compare to f(x)?', opts: ['shifts left 2', 'shifts right 2', 'shifts up 2', 'shifts down 2'], a: 1, e: 'Subtracting inside the argument shifts the graph right by 2.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'What transformation does -f(x) represent?', opts: ['reflection over y-axis', 'reflection over x-axis', 'shift up', 'reflection over y = x'], a: 1, e: 'Negating the output reflects the graph across the x-axis.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'How does the graph of f(x + 4) compare to f(x)?', opts: ['shifts right 4', 'shifts up 4', 'shifts left 4', 'shifts down 4'], a: 2, e: 'Adding inside the argument shifts the graph left by 4.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'What transformation does 2f(x) represent?', opts: ['horizontal stretch', 'vertical compression', 'shift up 2', 'vertical stretch by 2'], a: 3, e: 'Multiplying the output by 2 stretches the graph vertically by a factor of 2.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'What transformation does f(-x) represent?', opts: ['reflection over x-axis', 'reflection over y-axis', 'shift left', 'shift down'], a: 1, e: 'Negating the input reflects the graph across the y-axis.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'How does the graph of f(x) - 5 compare to f(x)?', opts: ['shifts up 5', 'shifts right 5', 'shifts down 5', 'shifts left 5'], a: 2, e: 'Subtracting a constant outside the function shifts the graph down by 5.', tags: ['Pre-Calculus', 'Transformations of Functions'] },
  { q: 'What is the vertex of y = (x + 1)^2 - 3?', opts: ['(1, -3)', '(-1, 3)', '(1, 3)', '(-1, -3)'], a: 3, e: 'Vertex form (x - h)^2 + k gives h = -1 and k = -3, so the vertex is (-1, -3).', tags: ['Pre-Calculus', 'Transformations of Functions'] },

  // ── Level 4 — Composite & Inverse Functions ──
  { q: 'If f(x) = x + 2 and g(x) = 3x, what is f(g(2))?', opts: ['12', '10', '6', '8'], a: 3, e: 'g(2) = 6, then f(6) = 6 + 2 = 8.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = 2x and g(x) = x - 1, what is g(f(3))?', opts: ['7', '6', '5', '4'], a: 2, e: 'f(3) = 6, then g(6) = 6 - 1 = 5.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = x + 5, what is f^-1(x)?', opts: ['x + 5', 'x - 5', '5 - x', '5x'], a: 1, e: 'Solving y = x + 5 for x gives x = y - 5, so f^-1(x) = x - 5.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = 2x, what is f^-1(x)?', opts: ['2x', 'x/2', 'x - 2', '-2x'], a: 1, e: 'Solving y = 2x for x gives x = y/2, so f^-1(x) = x/2.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = 3x - 6, what is f^-1(x)?', opts: ['(x - 6)/3', '3x + 6', '(x + 6)/3', '(x + 6)*3'], a: 2, e: 'Solving y = 3x - 6 gives x = (y + 6)/3, so f^-1(x) = (x + 6)/3.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = x^2 for x ≥ 0, what is f^-1(x)?', opts: ['x^2', '√x', '1/x^2', '-√x'], a: 1, e: 'The inverse of squaring (for x ≥ 0) is the principal square root, √x.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f(x) = x^3 and g(x) = x + 1, what is f(g(1))?', opts: ['8', '2', '7', '9'], a: 0, e: 'g(1) = 2, then f(2) = 2^3 = 8.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },
  { q: 'If f and g are inverse functions, what does f(g(x)) equal?', opts: ['1', '0', 'x', 'g(x)'], a: 2, e: 'Inverse functions undo each other, so f(g(x)) = x.', tags: ['Pre-Calculus', 'Composite & Inverse Functions'] },

  // ── Level 5 — Polynomial & Rational Functions ──
  { q: 'What is the degree of f(x) = x^3 + 2x - 1?', opts: ['1', '2', '3', '4'], a: 2, e: 'The degree is the highest exponent, which is 3.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What are the roots of x^2 - 5x + 6 = 0?', opts: ['-2 and -3', '1 and 6', '2 and -3', '2 and 3'], a: 3, e: 'It factors as (x - 2)(x - 3) = 0, giving x = 2 and x = 3.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What is the vertical asymptote of f(x) = 1/(x - 4)?', opts: ['x = -4', 'x = 4', 'y = 4', 'x = 0'], a: 1, e: 'The denominator is zero at x = 4, giving a vertical asymptote there.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What is the end behavior of f(x) = -x^2?', opts: ['both ends up', 'both ends down', 'up-left, down-right', 'down-left, up-right'], a: 1, e: 'A negative leading coefficient on an even degree sends both ends to -∞ (down).', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What is the x-intercept of f(x) = 2x - 8?', opts: ['-4', '8', '4', '2'], a: 2, e: 'Setting 2x - 8 = 0 gives x = 4.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What is the horizontal asymptote of f(x) = 2x/(x + 1)?', opts: ['y = 2', 'y = 0', 'y = 1', 'x = 2'], a: 0, e: 'Equal degrees give a horizontal asymptote at the ratio of leading coefficients, y = 2.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'How many roots (counting multiplicity) does a degree-4 polynomial have?', opts: ['2', '3', '4', '5'], a: 2, e: 'By the Fundamental Theorem of Algebra a degree-4 polynomial has exactly 4 roots.', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },
  { q: 'What is the factored form of x^2 - 9?', opts: ['(x - 9)(x + 1)', '(x - 3)^2', '(x + 3)^2', '(x - 3)(x + 3)'], a: 3, e: 'This is a difference of squares: x^2 - 9 = (x - 3)(x + 3).', tags: ['Pre-Calculus', 'Polynomial & Rational Functions'] },

  // ── Level 6 — Logarithms ──
  { q: 'What is log_2(8)?', opts: ['16', '9', '3', '4'], a: 2, e: 'Since 2^3 = 8, log_2(8) = 3.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log(100) (base 10)?', opts: ['2', '1', '10', '100'], a: 0, e: 'Since 10^2 = 100, log(100) = 2.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log_3(9)?', opts: ['9', '6', '3', '2'], a: 3, e: 'Since 3^2 = 9, log_3(9) = 2.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is ln(e)?', opts: ['0', '1', 'e', '-1'], a: 1, e: 'ln is base e, and e^1 = e, so ln(e) = 1.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log_5(1)?', opts: ['5', '0', '1', '-1'], a: 1, e: 'Any base raised to 0 equals 1, so log_5(1) = 0.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log_2(1/8)?', opts: ['3', '8', '-8', '-3'], a: 3, e: 'Since 1/8 = 2^-3, log_2(1/8) = -3.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log_2(32)?', opts: ['5', '6', '4', '16'], a: 0, e: 'Since 2^5 = 32, log_2(32) = 5.', tags: ['Pre-Calculus', 'Logarithms'] },
  { q: 'What is log_4(16)?', opts: ['16', '4', '2', '8'], a: 2, e: 'Since 4^2 = 16, log_4(16) = 2.', tags: ['Pre-Calculus', 'Logarithms'] },

  // ── Level 7 — Exponential & Log Equations ──
  { q: 'Solve for x: 2^x = 8.', opts: ['2', '3', '4', '8'], a: 1, e: 'Since 2^3 = 8, x = 3.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: e^x = 1.', opts: ['1', 'e', '-1', '0'], a: 3, e: 'Any base to the power 0 equals 1, so x = 0.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: log_2(x) = 4.', opts: ['4', '8', '16', '2'], a: 2, e: 'Rewriting gives x = 2^4 = 16.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: 3^x = 81.', opts: ['4', '3', '9', '27'], a: 0, e: 'Since 3^4 = 81, x = 4.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: 10^x = 1000.', opts: ['30', '10', '2', '3'], a: 3, e: 'Since 10^3 = 1000, x = 3.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: ln(x) = 1.', opts: ['1', 'e', '0', '2'], a: 1, e: 'Rewriting gives x = e^1 = e.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: 5^x = 25.', opts: ['5', '25', '2', '1'], a: 2, e: 'Since 5^2 = 25, x = 2.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },
  { q: 'Solve for x: log_3(x) = 2.', opts: ['9', '6', '3', '12'], a: 0, e: 'Rewriting gives x = 3^2 = 9.', tags: ['Pre-Calculus', 'Exponential & Log Equations'] },

  // ── Level 8 — Sequences & Series ──
  { q: 'What is the common difference of the sequence 2, 5, 8, 11, ...?', opts: ['2', '3', '5', '1'], a: 1, e: 'Each term increases by 3, so the common difference is 3.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the next term of 3, 7, 11, 15, ...?', opts: ['17', '18', '20', '19'], a: 3, e: 'The common difference is 4, so 15 + 4 = 19.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the common ratio of the sequence 2, 6, 18, 54, ...?', opts: ['3', '2', '6', '4'], a: 0, e: 'Each term is multiplied by 3, so the common ratio is 3.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'For an arithmetic sequence with a1 = 1 and d = 2, what is the 10th term?', opts: ['20', '21', '19', '18'], a: 2, e: 'a10 = 1 + (10 - 1)(2) = 1 + 18 = 19.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the sum of the first five terms of 1, 2, 3, 4, 5?', opts: ['10', '15', '20', '25'], a: 1, e: '1 + 2 + 3 + 4 + 5 = 15.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the next term of the geometric sequence 1, 2, 4, 8, ...?', opts: ['10', '12', '14', '16'], a: 3, e: 'The common ratio is 2, so 8 × 2 = 16.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the sum 1 + 2 + 3 + ... + 100?', opts: ['5000', '5050', '2550', '10100'], a: 1, e: 'Using n(n + 1)/2 = 100(101)/2 = 5050.', tags: ['Pre-Calculus', 'Sequences & Series'] },
  { q: 'What is the nth term of the sequence 5, 10, 15, 20, ...?', opts: ['5n', 'n + 5', '5 + n', '10n'], a: 0, e: 'The terms are multiples of 5, so the nth term is 5n.', tags: ['Pre-Calculus', 'Sequences & Series'] },

  // ── Level 9 — Complex Numbers ──
  { q: 'What is i^2 (where i = √-1)?', opts: ['1', '-1', 'i', '-i'], a: 1, e: 'By definition i = √-1, so i^2 = -1.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is (2 + 3i) + (1 - i)?', opts: ['3 + 2i', '3 + 4i', '1 + 2i', '3 - 2i'], a: 0, e: 'Add real parts 2 + 1 = 3 and imaginary parts 3i - i = 2i, giving 3 + 2i.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is (2 + 3i) - (1 - i)?', opts: ['1 + 2i', '3 + 2i', '1 + 3i', '1 + 4i'], a: 3, e: 'Subtract: (2 - 1) + (3i - (-i)) = 1 + 4i.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is i^4?', opts: ['-1', 'i', '1', '-i'], a: 2, e: 'i^4 = (i^2)^2 = (-1)^2 = 1.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is (1 + i)(1 - i)?', opts: ['0', '2', '2i', '1 + i'], a: 1, e: 'This is 1 - i^2 = 1 - (-1) = 2.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is the complex conjugate of 3 + 4i?', opts: ['3 - 4i', '-3 + 4i', '-3 - 4i', '4 - 3i'], a: 0, e: 'The conjugate flips the sign of the imaginary part, giving 3 - 4i.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is i^3?', opts: ['i', '-i', '1', '-1'], a: 1, e: 'i^3 = i^2 · i = -1 · i = -i.', tags: ['Pre-Calculus', 'Complex Numbers'] },
  { q: 'What is (2i)(3i)?', opts: ['6', '6i', '-6i', '-6'], a: 3, e: '(2i)(3i) = 6i^2 = 6(-1) = -6.', tags: ['Pre-Calculus', 'Complex Numbers'] },

  // ── Level 10 — Introduction to Limits ──
  { q: 'What is lim x→2 of (x + 3)?', opts: ['5', '2', '3', '6'], a: 0, e: 'The function is continuous, so substitute: 2 + 3 = 5.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→0 of x^2?', opts: ['1', '2', 'undefined', '0'], a: 3, e: 'Substitute directly: 0^2 = 0.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→3 of 2x?', opts: ['3', '6', '9', '2'], a: 1, e: 'Substitute directly: 2(3) = 6.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→2 of (x^2 - 4)/(x - 2)?', opts: ['0', '2', '4', 'undefined'], a: 2, e: 'Factor to (x + 2); the limit is 2 + 2 = 4.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→∞ of 1/x?', opts: ['1', '0', '∞', '-1'], a: 1, e: 'As x grows without bound, 1/x approaches 0.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→1 of (x^2 + 1)?', opts: ['1', '3', '2', '0'], a: 2, e: 'Substitute directly: 1^2 + 1 = 2.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→5 of (x - 5)/(x - 5)?', opts: ['0', '1', '5', 'undefined'], a: 1, e: 'For x ≠ 5 the expression equals 1, so the limit is 1.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
  { q: 'What is lim x→2 of (x^2 - 4)/(x + 2)?', opts: ['0', '4', '-4', 'undefined'], a: 0, e: 'Substitute: (4 - 4)/(2 + 2) = 0/4 = 0.', tags: ['Pre-Calculus', 'Introduction to Limits'] },
];
