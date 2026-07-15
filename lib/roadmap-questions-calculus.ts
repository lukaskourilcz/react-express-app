// Calculus roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const calculusSeeds: Seed[] = [
  // ── Level 1 — Limits ──
  { q: 'What is lim x→2 (x + 3)?', opts: ['3', '5', '6', '2'], a: 1, e: 'Direct substitution gives 2 + 3 = 5.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→0 x^2?', opts: ['0', '1', 'undefined', '2'], a: 0, e: 'Substituting x = 0 gives 0^2 = 0.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→3 2x?', opts: ['3', '5', '6', '9'], a: 2, e: 'Direct substitution gives 2·3 = 6.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→0 sin(x)/x?', opts: ['0', '1', '∞', 'undefined'], a: 1, e: 'This is the classic special limit equal to 1.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→∞ 1/x?', opts: ['1', '∞', '0', '-1'], a: 2, e: 'As x grows without bound, 1/x approaches 0.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→2 (x^2 - 4)/(x - 2)?', opts: ['0', '2', '4', 'undefined'], a: 2, e: 'Factor to (x-2)(x+2)/(x-2) = x+2, which at x=2 gives 4.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→10 5?', opts: ['0', '5', 'x', 'undefined'], a: 1, e: 'The limit of a constant is the constant itself, 5.', tags: ['Calculus', 'Limits'] },
  { q: 'What is lim x→1 (x^2 + 1)?', opts: ['1', '2', '3', '0'], a: 1, e: 'Substituting x = 1 gives 1 + 1 = 2.', tags: ['Calculus', 'Limits'] },

  // ── Level 2 — Continuity ──
  { q: 'A function is continuous at x = a if lim x→a f(x) equals what?', opts: ['f(a)', '0', 'a', 'the derivative'], a: 0, e: 'Continuity requires the limit to equal the function value f(a).', tags: ['Calculus', 'Continuity'] },
  { q: 'Is f(x) = 1/x continuous at x = 0?', opts: ['Yes', 'No, it is undefined at 0', 'Only from the left', 'Yes everywhere'], a: 1, e: '1/x is undefined at x = 0, so it cannot be continuous there.', tags: ['Calculus', 'Continuity'] },
  { q: 'Which function is continuous for all real numbers?', opts: ['1/x', 'tan(x)', 'x^2', '1/(x-1)'], a: 2, e: 'Polynomials like x^2 are continuous everywhere.', tags: ['Calculus', 'Continuity'] },
  { q: 'A removable discontinuity occurs when the limit exists but...', opts: ['it does not equal f(a) (or f(a) is undefined)', 'the limit is infinite', 'the function jumps', 'none of these'], a: 0, e: 'A hole is removable: the limit exists but differs from or replaces f(a).', tags: ['Calculus', 'Continuity'] },
  { q: 'Is f(x) = |x| continuous at x = 0?', opts: ['Yes', 'No', 'Only from the right', 'Undefined'], a: 0, e: 'The absolute value has no break; it is continuous at x = 0.', tags: ['Calculus', 'Continuity'] },
  { q: 'A step function has what kind of discontinuity?', opts: ['Removable', 'Jump', 'Infinite', 'None'], a: 1, e: 'A step function jumps from one value to another, a jump discontinuity.', tags: ['Calculus', 'Continuity'] },
  { q: 'What discontinuity does 1/(x - 1) have at x = 1?', opts: ['Removable', 'Jump', 'Infinite', 'Continuous'], a: 2, e: 'The function blows up to infinity at x = 1, an infinite discontinuity.', tags: ['Calculus', 'Continuity'] },
  { q: 'For f continuous on [a, b], the Intermediate Value Theorem guarantees that f...', opts: ['takes every value between f(a) and f(b)', 'is differentiable', 'has a maximum only', 'is linear'], a: 0, e: 'The IVT says a continuous function attains all intermediate values.', tags: ['Calculus', 'Continuity'] },

  // ── Level 3 — The Derivative ──
  { q: 'What does the derivative measure?', opts: ['Area under a curve', 'Instantaneous rate of change', 'The limit at infinity', 'The y-intercept'], a: 1, e: 'The derivative gives the instantaneous rate of change (the slope).', tags: ['Calculus', 'The Derivative'] },
  { q: 'What is d/dx[x^2]?', opts: ['x', '2x', 'x^2', '2'], a: 1, e: 'By the power rule, d/dx[x^2] = 2x.', tags: ['Calculus', 'The Derivative'] },
  { q: 'What is d/dx[c] for a constant c?', opts: ['c', '1', '0', 'x'], a: 2, e: 'The derivative of any constant is 0.', tags: ['Calculus', 'The Derivative'] },
  { q: 'What is d/dx[x]?', opts: ['0', '1', 'x', '2x'], a: 1, e: 'The derivative of x with respect to x is 1.', tags: ['Calculus', 'The Derivative'] },
  { q: 'The derivative as a limit is f\'(x) = lim h→0 of what?', opts: ['(f(x+h) - f(x))/h', '(f(x) - f(h))/h', 'f(x+h) - f(x)', 'f(x)/h'], a: 0, e: 'This difference quotient defines the derivative.', tags: ['Calculus', 'The Derivative'] },
  { q: 'What is d/dx[3x]?', opts: ['3', 'x', '3x', '0'], a: 0, e: 'The derivative of 3x is the constant slope 3.', tags: ['Calculus', 'The Derivative'] },
  { q: 'At a point, f\'(x) equals the slope of which line?', opts: ['The secant line', 'The tangent line', 'The normal line', 'The x-axis'], a: 1, e: 'The derivative is the slope of the tangent line at that point.', tags: ['Calculus', 'The Derivative'] },
  { q: 'What is d/dx[x^3]?', opts: ['3x^2', 'x^2', '3x', '2x^3'], a: 0, e: 'By the power rule, d/dx[x^3] = 3x^2.', tags: ['Calculus', 'The Derivative'] },

  // ── Level 4 — Derivative Rules ──
  { q: 'What is d/dx[x^n] by the power rule?', opts: ['n·x^(n-1)', 'x^(n-1)', 'n·x^n', '(n-1)·x^n'], a: 0, e: 'The power rule gives n·x^(n-1).', tags: ['Calculus', 'Derivative Rules'] },
  { q: 'What is d/dx[sin(x)]?', opts: ['cos(x)', '-cos(x)', '-sin(x)', 'sin(x)'], a: 0, e: 'The derivative of sin(x) is cos(x).', tags: ['Calculus', 'Derivative Rules'] },
  { q: 'What is d/dx[cos(x)]?', opts: ['sin(x)', '-sin(x)', 'cos(x)', '-cos(x)'], a: 1, e: 'The derivative of cos(x) is -sin(x).', tags: ['Calculus', 'Derivative Rules'] },
  { q: 'What is d/dx[e^x]?', opts: ['x·e^(x-1)', 'e^x', 'e^x/x', '1'], a: 1, e: 'e^x is its own derivative.', tags: ['Calculus', 'Derivative Rules'] },
  { q: 'What is d/dx[ln(x)]?', opts: ['1/x', 'ln(x)', 'x', '-1/x^2'], a: 0, e: 'The derivative of ln(x) is 1/x.', tags: ['Calculus', 'Derivative Rules'] },
  { q: 'The product rule states d/dx[f·g] = ?', opts: ["f'·g'", "f'·g + f·g'", "f'·g - f·g'", "f·g'"], a: 1, e: "The product rule is f'·g + f·g'.", tags: ['Calculus', 'Derivative Rules'] },
  { q: 'The quotient rule states d/dx[f/g] = ?', opts: ["(f'·g - f·g')/g^2", "(f·g' - f'·g)/g^2", "f'/g'", "(f'·g + f·g')/g^2"], a: 0, e: "The quotient rule is (f'·g - f·g')/g^2.", tags: ['Calculus', 'Derivative Rules'] },
  { q: 'What is d/dx[5x^4]?', opts: ['20x^3', '5x^3', '20x^4', '4x^3'], a: 0, e: 'Bring down the 4: 5·4·x^3 = 20x^3.', tags: ['Calculus', 'Derivative Rules'] },

  // ── Level 5 — The Chain Rule ──
  { q: 'The chain rule states d/dx[f(g(x))] = ?', opts: ["f'(g(x))", "f'(g(x))·g'(x)", "f'(x)·g'(x)", "f(g'(x))"], a: 1, e: "Multiply the outer derivative by the inner derivative: f'(g(x))·g'(x).", tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[(x^2 + 1)^3]?', opts: ['3(x^2+1)^2', '2x(x^2+1)^3', '6x(x^2+1)^2', '6x(x^2+1)^3'], a: 2, e: 'Chain rule: 3(x^2+1)^2·(2x) = 6x(x^2+1)^2.', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[sin(2x)]?', opts: ['2cos(2x)', 'cos(2x)', '-2cos(2x)', '2sin(2x)'], a: 0, e: 'Chain rule: cos(2x)·2 = 2cos(2x).', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[e^(3x)]?', opts: ['e^(3x)', '3e^x', 'e^(3x)/3', '3e^(3x)'], a: 3, e: 'Chain rule: e^(3x)·3 = 3e^(3x).', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[(3x + 1)^5]?', opts: ['5(3x+1)^4', '3(3x+1)^4', '15(3x+1)^4', '5(3x+1)^5'], a: 2, e: 'Chain rule: 5(3x+1)^4·3 = 15(3x+1)^4.', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[cos(x^2)]?', opts: ['-sin(x^2)', '2x·sin(x^2)', '-sin(2x)', '-2x·sin(x^2)'], a: 3, e: 'Chain rule: -sin(x^2)·2x = -2x·sin(x^2).', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[ln(5x)]?', opts: ['1/x', '5/x', '1/(5x)', 'ln(5)'], a: 0, e: 'Chain rule: (1/(5x))·5 = 1/x.', tags: ['Calculus', 'The Chain Rule'] },
  { q: 'What is d/dx[(x^3 + 2x)^4]?', opts: ['4(x^3+2x)^3', '(3x^2+2)(x^3+2x)^3', '4(3x^2+2)(x^3+2x)^3', '12x^2(x^3+2x)^3'], a: 2, e: 'Chain rule: 4(x^3+2x)^3·(3x^2+2).', tags: ['Calculus', 'The Chain Rule'] },

  // ── Level 6 — Applications of Derivatives ──
  { q: 'If f\'(x) > 0 on an interval, the function is...', opts: ['increasing', 'decreasing', 'constant', 'concave'], a: 0, e: 'A positive derivative means the function is increasing.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'A critical point occurs where f\'(x) equals...', opts: ['0 (or is undefined)', '1', '∞', 'the maximum'], a: 0, e: 'Critical points are where the derivative is zero or undefined.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'If f\'\'(x) > 0, the graph is...', opts: ['concave down', 'concave up', 'linear', 'decreasing'], a: 1, e: 'A positive second derivative means the graph is concave up.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'At a smooth local maximum, f\'(x) equals...', opts: ['0', 'a positive number', 'a negative number', 'undefined always'], a: 0, e: 'The tangent is horizontal at a smooth local max, so f\'(x) = 0.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'An inflection point is where...', opts: ["f'(x) = 0", 'concavity changes', 'f is a maximum', 'f is undefined'], a: 1, e: 'An inflection point is where the concavity switches sign.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'If position is s(t), then velocity is...', opts: ["s'(t)", 's(t)', "s''(t)", '∫s dt'], a: 0, e: 'Velocity is the derivative of position, s\'(t).', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'The Mean Value Theorem guarantees a point where f\'(c) equals...', opts: ['0', 'the average rate of change over [a, b]', 'the maximum', 'f(c)'], a: 1, e: 'The MVT gives a point where the instantaneous rate equals the average rate.', tags: ['Calculus', 'Applications of Derivatives'] },
  { q: 'If f\'(a) = 0 and f\'\'(a) < 0, then a is a...', opts: ['local minimum', 'inflection point', 'local maximum', 'saddle point'], a: 2, e: 'A negative second derivative at a critical point signals a local maximum.', tags: ['Calculus', 'Applications of Derivatives'] },

  // ── Level 7 — Optimization ──
  { q: 'The first step in optimization is to set which quantity to zero?', opts: ["f'(x)", 'f(x)', "f''(x)", 'x'], a: 0, e: 'Setting f\'(x) = 0 locates candidate optima (critical points).', tags: ['Calculus', 'Optimization'] },
  { q: 'A rectangle with a fixed perimeter has maximum area when it is a...', opts: ['square', 'long thin strip', 'triangle', 'circle'], a: 0, e: 'For fixed perimeter, the square maximizes area.', tags: ['Calculus', 'Optimization'] },
  { q: 'At what x does f(x) = x^2 - 4x reach its minimum?', opts: ['0', '2', '4', '-2'], a: 1, e: 'f\'(x) = 2x - 4 = 0 gives x = 2.', tags: ['Calculus', 'Optimization'] },
  { q: 'What is the minimum value of f(x) = x^2 - 4x?', opts: ['-4', '0', '4', '-2'], a: 0, e: 'At x = 2, f(2) = 4 - 8 = -4.', tags: ['Calculus', 'Optimization'] },
  { q: 'On a closed interval [a, b], extrema can occur at critical points and...', opts: ['midpoints', 'endpoints', 'inflection points', 'the origin'], a: 1, e: 'Always also check the endpoints of the interval.', tags: ['Calculus', 'Optimization'] },
  { q: 'To find the largest rectangle under a curve, you...', opts: ['set the derivative of the area function to zero', 'integrate the area', 'use only the second derivative', 'guess and check'], a: 0, e: 'Maximize by differentiating the area function and solving for zero.', tags: ['Calculus', 'Optimization'] },
  { q: 'For x > 0, at what x is f(x) = x^2 + 16/x minimized?', opts: ['1', '4', '2', '8'], a: 2, e: 'f\'(x) = 2x - 16/x^2 = 0 gives x^3 = 8, so x = 2.', tags: ['Calculus', 'Optimization'] },
  { q: 'To minimize material for an open-top box of fixed volume, you...', opts: ['set the derivative of the surface area to zero', 'maximize the base', 'make it infinitely tall', 'ignore the volume constraint'], a: 0, e: 'Express surface area using the volume constraint, then set its derivative to zero.', tags: ['Calculus', 'Optimization'] },

  // ── Level 8 — The Integral ──
  { q: 'What is ∫x dx?', opts: ['x^2/2 + C', 'x^2 + C', '2x + C', '1 + C'], a: 0, e: 'By the power rule for integrals, ∫x dx = x^2/2 + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫dx?', opts: ['x + C', '1 + C', '0', 'C'], a: 0, e: 'The integral of 1 with respect to x is x + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫x^2 dx?', opts: ['x^3 + C', '2x + C', 'x^3/3 + C', '3x^2 + C'], a: 2, e: 'Add one to the power and divide: x^3/3 + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫cos(x) dx?', opts: ['sin(x) + C', '-sin(x) + C', 'cos(x) + C', '-cos(x) + C'], a: 0, e: 'The antiderivative of cos(x) is sin(x) + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫sin(x) dx?', opts: ['cos(x) + C', 'sin(x) + C', '-sin(x) + C', '-cos(x) + C'], a: 3, e: 'The antiderivative of sin(x) is -cos(x) + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫e^x dx?', opts: ['e^x + C', 'x·e^x + C', 'e^x/x + C', 'e^(x+1) + C'], a: 0, e: 'e^x is its own antiderivative: e^x + C.', tags: ['Calculus', 'The Integral'] },
  { q: 'A definite integral from a to b represents...', opts: ['the slope', 'the net area under the curve', 'the derivative', 'the tangent line'], a: 1, e: 'A definite integral gives the net (signed) area under the curve.', tags: ['Calculus', 'The Integral'] },
  { q: 'What is ∫3x^2 dx?', opts: ['x^3 + C', '6x + C', 'x^3/3 + C', '9x^3 + C'], a: 0, e: '∫3x^2 dx = 3·x^3/3 + C = x^3 + C.', tags: ['Calculus', 'The Integral'] },

  // ── Level 9 — Integration Techniques ──
  { q: 'What is ∫(1/x) dx?', opts: ['ln|x| + C', '-1/x^2 + C', '1 + C', 'x·ln(x) + C'], a: 0, e: 'The antiderivative of 1/x is ln|x| + C.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'u-substitution reverses which differentiation rule?', opts: ['product rule', 'chain rule', 'quotient rule', 'power rule'], a: 1, e: 'u-substitution undoes the chain rule.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'Using u = x^2 + 1, what is ∫2x(x^2 + 1)^3 dx?', opts: ['(x^2+1)^4 + C', '2(x^2+1)^4 + C', '(x^2+1)^3 + C', '(x^2+1)^4/4 + C'], a: 3, e: 'With du = 2x dx, ∫u^3 du = u^4/4 = (x^2+1)^4/4 + C.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'The integration by parts formula is ∫u dv = ?', opts: ['u·v - ∫v du', 'u·v + ∫v du', '∫v du - u·v', 'u·v'], a: 0, e: 'Integration by parts: ∫u dv = u·v - ∫v du.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'What is ∫e^(2x) dx?', opts: ['e^(2x) + C', '2e^(2x) + C', 'e^(2x)/2 + C', 'e^x + C'], a: 2, e: 'Divide by the inner coefficient: e^(2x)/2 + C.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'What is ∫cos(3x) dx?', opts: ['3sin(3x) + C', 'sin(3x) + C', '-sin(3x)/3 + C', 'sin(3x)/3 + C'], a: 3, e: 'Divide by the inner coefficient: sin(3x)/3 + C.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'For ∫x·e^x dx by parts, which is the best choice of u?', opts: ['e^x', 'x', 'x·e^x', 'dx'], a: 1, e: 'Choose u = x so that du simplifies the integral.', tags: ['Calculus', 'Integration Techniques'] },
  { q: 'What is ∫sec^2(x) dx?', opts: ['tan(x) + C', 'sec(x) + C', '-tan(x) + C', 'sec(x)·tan(x) + C'], a: 0, e: 'The antiderivative of sec^2(x) is tan(x) + C.', tags: ['Calculus', 'Integration Techniques'] },

  // ── Level 10 — The Fundamental Theorem ──
  { q: 'The Fundamental Theorem of Calculus connects differentiation with...', opts: ['limits', 'integration', 'continuity', 'optimization'], a: 1, e: 'The FTC links the derivative and the integral as inverse processes.', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is d/dx[∫ from a to x f(t) dt]?', opts: ['f(x)', 'F(x)', 'f(a)', "f'(x)"], a: 0, e: 'The first part of the FTC gives f(x).', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'If F is an antiderivative of f, then ∫ from a to b f(x) dx equals...', opts: ['F(a) - F(b)', 'F(b) - F(a)', 'F(b) + F(a)', 'f(b) - f(a)'], a: 1, e: 'The second part of the FTC evaluates F at the bounds: F(b) - F(a).', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is ∫ from 0 to 2 x dx?', opts: ['4', '1', '2', '0'], a: 2, e: 'The antiderivative x^2/2 evaluated from 0 to 2 gives 2 - 0 = 2.', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is ∫ from 0 to π sin(x) dx?', opts: ['0', '1', '2', '-2'], a: 2, e: '[-cos(x)] from 0 to π = -cos(π) + cos(0) = 1 + 1 = 2.', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is ∫ from 1 to 3 2x dx?', opts: ['8', '9', '6', '4'], a: 0, e: '[x^2] from 1 to 3 = 9 - 1 = 8.', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is ∫ from 0 to 1 e^x dx?', opts: ['e', 'e - 1', '1 - e', 'e + 1'], a: 1, e: '[e^x] from 0 to 1 = e^1 - e^0 = e - 1.', tags: ['Calculus', 'The Fundamental Theorem'] },
  { q: 'What is ∫ from 0 to 2 3x^2 dx?', opts: ['6', '8', '12', '4'], a: 1, e: '[x^3] from 0 to 2 = 8 - 0 = 8.', tags: ['Calculus', 'The Fundamental Theorem'] },
];
