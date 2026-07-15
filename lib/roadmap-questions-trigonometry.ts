// Trigonometry roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const trigonometrySeeds: Seed[] = [
  // ── Level 1 — Angles & Radians ──
  { q: 'How many degrees are in a full circle?', opts: ['180°', '270°', '90°', '360°'], a: 3, e: 'A full rotation around a circle measures 360°.', tags: ['Trigonometry', 'Radians'] },
  { q: 'How many radians equal 180°?', opts: ['π', '2π', 'π/2', 'π/4'], a: 0, e: 'A straight angle of 180° equals π radians.', tags: ['Trigonometry', 'Radians'] },
  { q: 'What is a right angle in degrees?', opts: ['45°', '60°', '90°', '180°'], a: 2, e: 'A right angle is exactly 90°.', tags: ['Trigonometry', 'Radians'] },
  { q: 'How many radians are in a full circle?', opts: ['π', '2π', '4π', 'π/2'], a: 1, e: 'A full circle is 360°, which equals 2π radians.', tags: ['Trigonometry', 'Radians'] },
  { q: 'Convert 90° to radians.', opts: ['π/2', 'π', 'π/3', 'π/4'], a: 0, e: 'Since 180° = π, half of that, 90°, equals π/2.', tags: ['Trigonometry', 'Radians'] },
  { q: 'What is the measure of a complete half turn?', opts: ['90°', '180°', '360°', '45°'], a: 1, e: 'A half turn is 180°, a straight angle.', tags: ['Trigonometry', 'Radians'] },
  { q: 'Which is the correct radian value of 45°?', opts: ['π/4', 'π/2', 'π/6', 'π/3'], a: 0, e: '45° is a quarter of 180°, so it equals π/4 radians.', tags: ['Trigonometry', 'Radians'] },
  { q: 'An angle between 0° and 90° is called what?', opts: ['Obtuse', 'Reflex', 'Acute', 'Straight'], a: 2, e: 'An acute angle measures more than 0° but less than 90°.', tags: ['Trigonometry', 'Radians'] },

  // ── Level 2 — Right-Triangle Ratios ──
  { q: 'In SOH-CAH-TOA, what does the "O" stand for?', opts: ['Origin', 'Opposite', 'Outer', 'Obtuse'], a: 1, e: 'The O refers to the side Opposite the angle.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'Which ratio equals opposite over hypotenuse?', opts: ['cos', 'tan', 'sec', 'sin'], a: 3, e: 'By SOH, sine equals opposite divided by hypotenuse.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'Which ratio equals adjacent over hypotenuse?', opts: ['cos', 'sin', 'tan', 'cot'], a: 0, e: 'By CAH, cosine equals adjacent divided by hypotenuse.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'Which ratio equals opposite over adjacent?', opts: ['sin', 'cos', 'tan', 'csc'], a: 2, e: 'By TOA, tangent equals opposite divided by adjacent.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'In a right triangle, the longest side is the?', opts: ['Adjacent', 'Opposite', 'Hypotenuse', 'Base'], a: 2, e: 'The hypotenuse is opposite the right angle and is the longest side.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'A right triangle has opposite 3 and hypotenuse 5. What is sin of the angle?', opts: ['3/5', '4/5', '3/4', '5/3'], a: 0, e: 'sin = opposite/hypotenuse = 3/5.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'A right triangle has adjacent 4 and hypotenuse 5. What is cos of the angle?', opts: ['3/5', '4/5', '4/3', '5/4'], a: 1, e: 'cos = adjacent/hypotenuse = 4/5.', tags: ['Trigonometry', 'Right Triangles'] },
  { q: 'A right triangle has opposite 3 and adjacent 4. What is tan of the angle?', opts: ['4/3', '3/5', '3/4', '5/4'], a: 2, e: 'tan = opposite/adjacent = 3/4.', tags: ['Trigonometry', 'Right Triangles'] },

  // ── Level 3 — Sine, Cosine & Tangent ──
  { q: 'What is sin(30°)?', opts: ['1/2', '√2/2', '√3/2', '1'], a: 0, e: 'sin(30°) = 1/2, a standard reference value.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is cos(60°)?', opts: ['√3/2', '1/2', '√2/2', '0'], a: 1, e: 'cos(60°) = 1/2, matching sin(30°).', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is tan(45°)?', opts: ['0', '1/2', '1', '√3'], a: 2, e: 'At 45° opposite equals adjacent, so tan(45°) = 1.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is cos(30°)?', opts: ['1/2', '√2/2', '√3/2', '1'], a: 2, e: 'cos(30°) = √3/2.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is sin(45°)?', opts: ['√2/2', '1/2', '√3/2', '1'], a: 0, e: 'sin(45°) = √2/2.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is sin(60°)?', opts: ['1/2', '√2/2', '√3/2', '1'], a: 2, e: 'sin(60°) = √3/2.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is tan(30°)?', opts: ['√3', '1', '√3/3', '1/2'], a: 2, e: 'tan(30°) = (1/2)/(√3/2) = 1/√3 = √3/3.', tags: ['Trigonometry', 'Special Angles'] },
  { q: 'What is cos(45°)?', opts: ['1/2', '√2/2', '√3/2', '0'], a: 1, e: 'cos(45°) = √2/2, equal to sin(45°).', tags: ['Trigonometry', 'Special Angles'] },

  // ── Level 4 — The Unit Circle ──
  { q: 'What is cos(0°) on the unit circle?', opts: ['0', '1', '-1', '1/2'], a: 1, e: 'At 0° the point is (1, 0), so cos(0°) = 1.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is sin(90°) on the unit circle?', opts: ['0', '1', '-1', '√2/2'], a: 1, e: 'At 90° the point is (0, 1), so sin(90°) = 1.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is cos(90°) on the unit circle?', opts: ['1', '0', '-1', '1/2'], a: 1, e: 'At 90° the point is (0, 1), so cos(90°) = 0.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is sin(180°) on the unit circle?', opts: ['1', '0', '-1', '√3/2'], a: 1, e: 'At 180° the point is (-1, 0), so sin(180°) = 0.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is cos(180°) on the unit circle?', opts: ['1', '0', '-1', '1/2'], a: 2, e: 'At 180° the point is (-1, 0), so cos(180°) = -1.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is sin(0°) on the unit circle?', opts: ['1', '0', '-1', '1/2'], a: 1, e: 'At 0° the point is (1, 0), so sin(0°) = 0.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'On the unit circle, a point is given by which coordinates?', opts: ['(sin θ, cos θ)', '(tan θ, cos θ)', '(cos θ, tan θ)', '(cos θ, sin θ)'], a: 3, e: 'A unit-circle point is (cos θ, sin θ), x then y.', tags: ['Trigonometry', 'Unit Circle'] },
  { q: 'What is cos(π) in radians on the unit circle?', opts: ['1', '0', '-1', '√2/2'], a: 2, e: 'π radians equals 180°, where cos = -1.', tags: ['Trigonometry', 'Unit Circle'] },

  // ── Level 5 — Trig of Any Angle ──
  { q: 'In which quadrant are both sin and cos positive?', opts: ['I', 'II', 'III', 'IV'], a: 0, e: 'In Quadrant I both x and y are positive, so sin and cos are positive.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is the sign of sin θ in Quadrant III?', opts: ['Positive', 'Zero', 'Undefined', 'Negative'], a: 3, e: 'In Quadrant III y is negative, so sin θ is negative.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is the sign of cos θ in Quadrant II?', opts: ['Positive', 'Negative', 'Zero', 'Undefined'], a: 1, e: 'In Quadrant II x is negative, so cos θ is negative.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is sin(150°)?', opts: ['1/2', '-1/2', '√3/2', '-√3/2'], a: 0, e: 'The reference angle is 30° and Quadrant II sine is positive, so sin(150°) = 1/2.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is cos(120°)?', opts: ['1/2', '-1/2', '√3/2', '-√3/2'], a: 1, e: 'Reference angle 60°, cosine negative in Quadrant II, so cos(120°) = -1/2.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'Which trig functions are positive in Quadrant IV?', opts: ['sin only', 'cos only', 'tan only', 'all'], a: 1, e: 'In Quadrant IV x is positive and y negative, so only cosine is positive.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is the reference angle for 210°?', opts: ['30°', '60°', '45°', '210°'], a: 0, e: '210° − 180° = 30°, the reference angle in Quadrant III.', tags: ['Trigonometry', 'Quadrants'] },
  { q: 'What is tan(135°)?', opts: ['1', '-1', '√3', '-√3'], a: 1, e: 'Reference angle 45° gives magnitude 1, and tangent is negative in Quadrant II, so tan(135°) = -1.', tags: ['Trigonometry', 'Quadrants'] },

  // ── Level 6 — Graphs of Trig Functions ──
  { q: 'What is the period of y = sin x (in degrees)?', opts: ['90°', '180°', '360°', '720°'], a: 2, e: 'The sine function repeats every 360°.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'What is the amplitude of y = 3 sin x?', opts: ['1', '3', '6', '1/3'], a: 1, e: 'Amplitude equals the absolute value of the coefficient, so it is 3.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'What is the maximum value of y = cos x?', opts: ['0', '1', '2', 'π'], a: 1, e: 'Cosine ranges from -1 to 1, so its maximum is 1.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'What is the range of y = sin x?', opts: ['[0, 1]', '[-1, 1]', '[-∞, ∞]', '[0, 2π]'], a: 1, e: 'Sine outputs values between -1 and 1 inclusive.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'The graph of y = tan x has vertical asymptotes where cos x equals?', opts: ['1', '0', '-1', '1/2'], a: 1, e: 'Tangent is sin/cos, undefined where cos x = 0.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'What is the period of y = tan x (in degrees)?', opts: ['90°', '180°', '360°', '270°'], a: 1, e: 'The tangent function repeats every 180°.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'What is the amplitude of y = cos x?', opts: ['0', '1', '2', 'π'], a: 1, e: 'The basic cosine has amplitude 1.', tags: ['Trigonometry', 'Graphs'] },
  { q: 'The period of y = sin(2x) is what fraction of the period of y = sin x?', opts: ['Half', 'Double', 'Same', 'Quarter'], a: 0, e: 'A coefficient of 2 inside compresses the graph, halving the period.', tags: ['Trigonometry', 'Graphs'] },

  // ── Level 7 — Trig Identities ──
  { q: 'What does sin²θ + cos²θ equal?', opts: ['0', '1', '2', 'tan θ'], a: 1, e: 'This is the Pythagorean identity: sin²θ + cos²θ = 1.', tags: ['Trigonometry', 'Identities'] },
  { q: 'tan θ is equal to which ratio?', opts: ['cos θ / sin θ', '1 / sin θ', 'sin θ · cos θ', 'sin θ / cos θ'], a: 3, e: 'By definition tan θ = sin θ / cos θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'What does 1 + tan²θ equal?', opts: ['sec²θ', 'csc²θ', 'cos²θ', '1'], a: 0, e: 'The identity 1 + tan²θ = sec²θ comes from dividing the Pythagorean identity by cos²θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'What is sin(2θ) in double-angle form?', opts: ['2 sin θ cos θ', 'sin²θ − cos²θ', '2 cos²θ', 'sin θ + cos θ'], a: 0, e: 'The double-angle identity is sin(2θ) = 2 sin θ cos θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'Which is true: sin(−θ) equals?', opts: ['sin θ', '−sin θ', 'cos θ', '1 − sin θ'], a: 1, e: 'Sine is an odd function, so sin(−θ) = −sin θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'Which is true: cos(−θ) equals?', opts: ['−cos θ', 'cos θ', 'sin θ', '1 − cos θ'], a: 1, e: 'Cosine is an even function, so cos(−θ) = cos θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'What does 1 + cot²θ equal?', opts: ['sec²θ', 'csc²θ', 'tan²θ', 'sin²θ'], a: 1, e: 'Dividing the Pythagorean identity by sin²θ gives 1 + cot²θ = csc²θ.', tags: ['Trigonometry', 'Identities'] },
  { q: 'The identity cos(2θ) can be written as?', opts: ['2 sin θ cos θ', 'cos²θ − sin²θ', 'sin²θ − cos²θ', '2 sin²θ'], a: 1, e: 'One form of the double-angle identity is cos(2θ) = cos²θ − sin²θ.', tags: ['Trigonometry', 'Identities'] },

  // ── Level 8 — Law of Sines ──
  { q: 'The Law of Sines states a/sin A equals which?', opts: ['b/sin B', 'b·sin B', 'sin B/b', 'b/cos B'], a: 0, e: 'The Law of Sines gives a/sin A = b/sin B = c/sin C.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'The Law of Sines is most directly useful when you know?', opts: ['Three sides', 'Two angles and one side', 'Three angles', 'Two sides and the included angle'], a: 1, e: 'With two angles and a side (AAS/ASA) the Law of Sines finds the rest.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'In a triangle A = 30°, a = 5, sin B = 0.6. Using a/sin A = b/sin B, what is b?', opts: ['3', '6', '9', '10'], a: 1, e: 'b = a·sin B/sin A = 5·0.6/0.5 = 6.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'If A = 40° and B = 60° in a triangle, what is C?', opts: ['70°', '80°', '100°', '60°'], a: 1, e: 'Angles sum to 180°, so C = 180° − 40° − 60° = 80°.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'The ambiguous case of the Law of Sines can occur with which given information?', opts: ['ASA', 'SSS', 'SSA', 'AAS'], a: 2, e: 'The SSA configuration may yield zero, one, or two triangles.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'Given a/sin A = c/sin C with a = 8, sin A = 0.5, sin C = 0.25, find c.', opts: ['2', '4', '8', '16'], a: 1, e: 'c = a·sin C/sin A = 8·0.25/0.5 = 4.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'In the Law of Sines, the side a is opposite which angle?', opts: ['A', 'B', 'C', 'the right angle'], a: 0, e: 'Each side is opposite the angle with the matching letter, so a is opposite A.', tags: ['Trigonometry', 'Law of Sines'] },
  { q: 'If a = 10, A = 90°, and B = 30°, what is b using the Law of Sines?', opts: ['5', '10', '20', '15'], a: 0, e: 'b = a·sin B/sin A = 10·0.5/1 = 5.', tags: ['Trigonometry', 'Law of Sines'] },

  // ── Level 9 — Law of Cosines ──
  { q: 'The Law of Cosines states c² equals?', opts: ['a² + b²', 'a² + b² + 2ab·cos C', 'a² − b²', 'a² + b² − 2ab·cos C'], a: 3, e: 'The Law of Cosines is c² = a² + b² − 2ab·cos C.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'The Law of Cosines is best used when you know?', opts: ['Two angles and a side', 'Three angles', 'Two sides and the included angle', 'One side only'], a: 2, e: 'With two sides and the included angle (SAS) it finds the third side.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'For a = 3, b = 4, C = 90°, find c using the Law of Cosines.', opts: ['5', '7', '25', '12'], a: 0, e: 'c² = 9 + 16 − 24·cos 90° = 25 − 0 = 25, so c = 5.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'When C = 90°, the Law of Cosines reduces to which theorem?', opts: ['Law of Sines', 'Pythagorean theorem', 'Triangle inequality', 'Heron’s formula'], a: 1, e: 'Since cos 90° = 0, c² = a² + b², the Pythagorean theorem.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'For a = 5, b = 7, C = 60°, find c². (cos 60° = 1/2)', opts: ['39', '74', '109', '35'], a: 0, e: 'c² = 25 + 49 − 2·5·7·(1/2) = 74 − 35 = 39.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'The Law of Cosines can also be used to find angles when you know?', opts: ['Two angles', 'All three sides', 'One side and one angle', 'Nothing'], a: 1, e: 'With all three sides (SSS) you can solve for any angle.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'For a = 2, b = 3, C = 90°, find c².', opts: ['5', '13', '6', '25'], a: 1, e: 'c² = 4 + 9 − 2·2·3·cos 90° = 13 − 0 = 13.', tags: ['Trigonometry', 'Law of Cosines'] },
  { q: 'In c² = a² + b² − 2ab·cos C, a larger angle C makes cos C smaller, which makes c?', opts: ['Larger', 'Smaller', 'Unchanged', 'Zero'], a: 0, e: 'Smaller cos C means less is subtracted, so c grows larger.', tags: ['Trigonometry', 'Law of Cosines'] },

  // ── Level 10 — Solving Trig Equations ──
  { q: 'Solve sin x = 0 for x in [0°, 360°).', opts: ['0° and 180°', '90° and 270°', '0° only', '180° only'], a: 0, e: 'Sine is zero at 0° and 180° within one period.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve cos x = 1 for x in [0°, 360°).', opts: ['0°', '90°', '180°', '360°'], a: 0, e: 'Cosine equals 1 only at 0° in the interval [0°, 360°).', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve sin x = 1/2 for x in [0°, 360°).', opts: ['30° and 150°', '30° and 330°', '60° and 120°', '150° and 210°'], a: 0, e: 'Sine equals 1/2 at 30° and its supplement 150°.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve tan x = 1 for x in [0°, 360°).', opts: ['45° and 225°', '45° and 135°', '135° and 315°', '45° only'], a: 0, e: 'Tangent equals 1 at 45° and 225°, one period apart.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve cos x = 0 for x in [0°, 360°).', opts: ['0° and 180°', '90° and 270°', '90° only', '180° and 360°'], a: 1, e: 'Cosine is zero at 90° and 270°.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve 2 sin x = 1 for x in [0°, 360°).', opts: ['30° and 150°', '60° and 120°', '30° and 330°', '45° and 135°'], a: 0, e: 'Dividing gives sin x = 1/2, so x = 30° and 150°.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve cos x = -1 for x in [0°, 360°).', opts: ['0°', '90°', '180°', '270°'], a: 2, e: 'Cosine equals -1 only at 180°.', tags: ['Trigonometry', 'Equations'] },
  { q: 'Solve sin x = -1 for x in [0°, 360°).', opts: ['90°', '180°', '270°', '360°'], a: 2, e: 'Sine reaches its minimum of -1 at 270°.', tags: ['Trigonometry', 'Equations'] },
];
