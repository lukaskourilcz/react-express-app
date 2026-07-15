// Geometry roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const geometrySeeds: Seed[] = [
  // ── Level 1 — Points, Lines & Angles ──
  { q: 'How many degrees are there in a right angle?', opts: ['45°', '90°', '180°', '360°'], a: 1, e: 'A right angle measures exactly 90°.', tags: ['Geometry', 'Angles'] },
  { q: 'Two angles lie on a straight line. One is 120°. What is the other?', opts: ['40°', '50°', '60°', '70°'], a: 2, e: 'Angles on a straight line add to 180°, so 180° − 120° = 60°.', tags: ['Geometry', 'Angles'] },
  { q: 'What is the complement of a 30° angle?', opts: ['60°', '70°', '150°', '30°'], a: 0, e: 'Complementary angles add to 90°, so 90° − 30° = 60°.', tags: ['Geometry', 'Angles'] },
  { q: 'What is the supplement of a 110° angle?', opts: ['90°', '80°', '70°', '20°'], a: 2, e: 'Supplementary angles add to 180°, so 180° − 110° = 70°.', tags: ['Geometry', 'Angles'] },
  { q: 'An angle measures 65°. Its vertically opposite angle measures:', opts: ['25°', '115°', '65°', '90°'], a: 2, e: 'Vertically opposite angles are always equal, so it is 65°.', tags: ['Geometry', 'Angles'] },
  { q: 'How many degrees are in a full turn around a point?', opts: ['90°', '180°', '270°', '360°'], a: 3, e: 'A complete turn (all angles around a point) totals 360°.', tags: ['Geometry', 'Angles'] },
  { q: 'An acute angle is an angle that is:', opts: ['Exactly 90°', 'Less than 90°', 'Between 90° and 180°', 'Exactly 180°'], a: 1, e: 'An acute angle measures less than 90°.', tags: ['Geometry', 'Angles'] },
  { q: 'Three angles meet at a point: 150°, 120°, and x. What is x?', opts: ['80°', '90°', '100°', '110°'], a: 1, e: 'Angles around a point add to 360°, so 360° − 150° − 120° = 90°.', tags: ['Geometry', 'Angles'] },

  // ── Level 2 — Triangles ──
  { q: 'The three interior angles of any triangle add up to:', opts: ['90°', '180°', '270°', '360°'], a: 1, e: 'The interior angles of a triangle always sum to 180°.', tags: ['Geometry', 'Triangles'] },
  { q: 'A triangle has angles of 50° and 60°. What is the third angle?', opts: ['60°', '70°', '80°', '90°'], a: 1, e: 'The angles sum to 180°, so 180° − 50° − 60° = 70°.', tags: ['Geometry', 'Triangles'] },
  { q: 'Each interior angle of an equilateral triangle measures:', opts: ['45°', '50°', '60°', '90°'], a: 2, e: 'An equilateral triangle has three equal angles: 180° ÷ 3 = 60°.', tags: ['Geometry', 'Triangles'] },
  { q: 'An isosceles triangle has a vertex angle of 40°. Each base angle is:', opts: ['40°', '50°', '70°', '80°'], a: 2, e: 'The two equal base angles share the rest: (180° − 40°) ÷ 2 = 70°.', tags: ['Geometry', 'Triangles'] },
  { q: 'A right triangle must contain exactly one angle equal to:', opts: ['45°', '60°', '90°', '180°'], a: 2, e: 'A right triangle contains one 90° angle.', tags: ['Geometry', 'Triangles'] },
  { q: 'A triangle has remote interior angles of 50° and 60°. The exterior angle equals:', opts: ['100°', '110°', '120°', '130°'], a: 1, e: 'An exterior angle equals the sum of the two remote interior angles: 50° + 60° = 110°.', tags: ['Geometry', 'Triangles'] },
  { q: 'A triangle in which all three sides have different lengths is called:', opts: ['Equilateral', 'Isosceles', 'Scalene', 'Right'], a: 2, e: 'A scalene triangle has three sides of different lengths.', tags: ['Geometry', 'Triangles'] },
  { q: 'Which set of angles can form a valid triangle?', opts: ['90°, 90°, 0°', '60°, 60°, 60°', '100°, 100°, 20°', '80°, 80°, 40°'], a: 1, e: 'Only 60° + 60° + 60° = 180°, the required total for a triangle.', tags: ['Geometry', 'Triangles'] },

  // ── Level 3 — Quadrilaterals & Polygons ──
  { q: 'The interior angles of any quadrilateral add up to:', opts: ['180°', '270°', '360°', '540°'], a: 2, e: 'A quadrilateral can be split into two triangles: 2 × 180° = 360°.', tags: ['Geometry', 'Polygons'] },
  { q: 'A shape with four equal sides and four right angles is a:', opts: ['Rectangle', 'Rhombus', 'Square', 'Trapezoid'], a: 2, e: 'A square has four equal sides and four 90° angles.', tags: ['Geometry', 'Polygons'] },
  { q: 'In a rectangle, opposite sides are always:', opts: ['Perpendicular', 'Equal in length', 'Different lengths', 'Curved'], a: 1, e: 'A rectangle has opposite sides equal in length and parallel.', tags: ['Geometry', 'Polygons'] },
  { q: 'The interior angles of a pentagon add up to:', opts: ['360°', '450°', '540°', '720°'], a: 2, e: 'Using (n − 2) × 180°: (5 − 2) × 180° = 540°.', tags: ['Geometry', 'Polygons'] },
  { q: 'Each interior angle of a regular hexagon measures:', opts: ['108°', '120°', '135°', '144°'], a: 1, e: 'Interior angle sum is (6 − 2) × 180° = 720°; 720° ÷ 6 = 120°.', tags: ['Geometry', 'Polygons'] },
  { q: 'In a parallelogram, opposite angles are:', opts: ['Equal', 'Supplementary but unequal', 'Always 90°', 'Always different'], a: 0, e: 'A parallelogram has opposite angles equal.', tags: ['Geometry', 'Polygons'] },
  { q: 'A trapezoid is defined by having:', opts: ['Four equal sides', 'At least one pair of parallel sides', 'Four right angles', 'No parallel sides'], a: 1, e: 'A trapezoid has (at least) one pair of parallel sides.', tags: ['Geometry', 'Polygons'] },
  { q: 'The interior angles of an octagon (8 sides) add up to:', opts: ['900°', '1080°', '1260°', '1440°'], a: 1, e: 'Using (n − 2) × 180°: (8 − 2) × 180° = 1080°.', tags: ['Geometry', 'Polygons'] },

  // ── Level 4 — Circles ──
  { q: 'A circle has a diameter of 12 cm. Its radius is:', opts: ['3 cm', '6 cm', '12 cm', '24 cm'], a: 1, e: 'The radius is half the diameter: 12 cm ÷ 2 = 6 cm.', tags: ['Geometry', 'Circles'] },
  { q: 'A circle has a radius of 8 cm. Its diameter is:', opts: ['4 cm', '8 cm', '16 cm', '64 cm'], a: 2, e: 'The diameter is twice the radius: 2 × 8 cm = 16 cm.', tags: ['Geometry', 'Circles'] },
  { q: 'Using π ≈ 3.14, the circumference of a circle with radius 10 cm (C = 2πr) is:', opts: ['31.4 cm', '62.8 cm', '314 cm', '100 cm'], a: 1, e: 'C = 2 × 3.14 × 10 = 62.8 cm.', tags: ['Geometry', 'Circles'] },
  { q: 'The value of π is approximately:', opts: ['2.14', '3.14', '3.41', '1.34'], a: 1, e: 'π is approximately 3.14.', tags: ['Geometry', 'Circles'] },
  { q: 'The longest chord that can be drawn in a circle is the:', opts: ['Radius', 'Arc', 'Diameter', 'Tangent'], a: 2, e: 'The diameter passes through the center and is the longest chord.', tags: ['Geometry', 'Circles'] },
  { q: 'Using π ≈ 3.14, the circumference of a circle with diameter 7 cm (C = πd) is:', opts: ['21.98 cm', '10.99 cm', '43.96 cm', '14 cm'], a: 0, e: 'C = 3.14 × 7 = 21.98 cm.', tags: ['Geometry', 'Circles'] },
  { q: 'The total angle measured at the center of a full circle is:', opts: ['90°', '180°', '270°', '360°'], a: 3, e: 'A full circle spans 360° at its center.', tags: ['Geometry', 'Circles'] },
  { q: 'The straight edge of a semicircle subtends an arc of:', opts: ['90°', '180°', '270°', '360°'], a: 1, e: 'A semicircle is half a circle, so its arc is 360° ÷ 2 = 180°.', tags: ['Geometry', 'Circles'] },

  // ── Level 5 — Perimeter ──
  { q: 'The perimeter of a square with side 5 cm is:', opts: ['10 cm', '15 cm', '20 cm', '25 cm'], a: 2, e: 'Perimeter = 4 × side = 4 × 5 = 20 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'A rectangle is 8 cm by 3 cm. Its perimeter is:', opts: ['11 cm', '22 cm', '24 cm', '48 cm'], a: 1, e: 'Perimeter = 2 × (8 + 3) = 22 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'The perimeter of an equilateral triangle with side 6 cm is:', opts: ['12 cm', '15 cm', '18 cm', '24 cm'], a: 2, e: 'All three sides are equal: 3 × 6 = 18 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'A rectangle measures 10 cm by 4 cm. Its perimeter is:', opts: ['14 cm', '28 cm', '40 cm', '48 cm'], a: 1, e: 'Perimeter = 2 × (10 + 4) = 28 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'The perimeter of a square with side 12 cm is:', opts: ['24 cm', '36 cm', '48 cm', '144 cm'], a: 2, e: 'Perimeter = 4 × 12 = 48 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'A triangle has sides 3 cm, 4 cm, and 5 cm. Its perimeter is:', opts: ['9 cm', '12 cm', '15 cm', '20 cm'], a: 1, e: 'Perimeter = 3 + 4 + 5 = 12 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'The perimeter of a regular pentagon with side 4 cm is:', opts: ['16 cm', '20 cm', '24 cm', '25 cm'], a: 1, e: 'A regular pentagon has 5 equal sides: 5 × 4 = 20 cm.', tags: ['Geometry', 'Perimeter'] },
  { q: 'A rectangle has a perimeter of 20 cm and a width of 4 cm. Its length is:', opts: ['5 cm', '6 cm', '8 cm', '16 cm'], a: 1, e: 'From 2 × (l + 4) = 20, l + 4 = 10, so l = 6 cm.', tags: ['Geometry', 'Perimeter'] },

  // ── Level 6 — Area ──
  { q: 'The area of a rectangle 6 cm by 4 cm is:', opts: ['10 cm²', '20 cm²', '24 cm²', '48 cm²'], a: 2, e: 'Area = length × width = 6 × 4 = 24 cm².', tags: ['Geometry', 'Area'] },
  { q: 'The area of a square with side 5 cm is:', opts: ['10 cm²', '20 cm²', '25 cm²', '30 cm²'], a: 2, e: 'Area = side² = 5 × 5 = 25 cm².', tags: ['Geometry', 'Area'] },
  { q: 'A triangle has base 8 cm and height 5 cm. Its area (A = 1/2 × b × h) is:', opts: ['13 cm²', '20 cm²', '40 cm²', '80 cm²'], a: 1, e: 'A = 1/2 × 8 × 5 = 20 cm².', tags: ['Geometry', 'Area'] },
  { q: 'The area of a rectangle 10 cm by 3 cm is:', opts: ['13 cm²', '26 cm²', '30 cm²', '60 cm²'], a: 2, e: 'Area = 10 × 3 = 30 cm².', tags: ['Geometry', 'Area'] },
  { q: 'A triangle has base 6 cm and height 10 cm. Its area is:', opts: ['16 cm²', '30 cm²', '60 cm²', '120 cm²'], a: 1, e: 'A = 1/2 × 6 × 10 = 30 cm².', tags: ['Geometry', 'Area'] },
  { q: 'Using π ≈ 3.14, the area of a circle with radius 5 cm (A = π r^2) is:', opts: ['15.7 cm²', '31.4 cm²', '78.5 cm²', '157 cm²'], a: 2, e: 'A = 3.14 × 5² = 3.14 × 25 = 78.5 cm².', tags: ['Geometry', 'Area'] },
  { q: 'A parallelogram has base 7 cm and height 4 cm. Its area (A = b × h) is:', opts: ['11 cm²', '22 cm²', '28 cm²', '56 cm²'], a: 2, e: 'Area = base × height = 7 × 4 = 28 cm².', tags: ['Geometry', 'Area'] },
  { q: 'The area of a square with side 9 cm is:', opts: ['18 cm²', '36 cm²', '72 cm²', '81 cm²'], a: 3, e: 'Area = side² = 9 × 9 = 81 cm².', tags: ['Geometry', 'Area'] },

  // ── Level 7 — Volume & Surface Area ──
  { q: 'A box measures 2 cm × 3 cm × 4 cm. Its volume (V = l × w × h) is:', opts: ['9 cm³', '18 cm³', '24 cm³', '48 cm³'], a: 2, e: 'V = 2 × 3 × 4 = 24 cm³.', tags: ['Geometry', 'Volume'] },
  { q: 'The volume of a cube with side 3 cm is:', opts: ['9 cm³', '18 cm³', '27 cm³', '54 cm³'], a: 2, e: 'V = side³ = 3 × 3 × 3 = 27 cm³.', tags: ['Geometry', 'Volume'] },
  { q: 'The surface area of a cube with side 2 cm (SA = 6 × s²) is:', opts: ['8 cm²', '12 cm²', '24 cm²', '36 cm²'], a: 2, e: 'SA = 6 × 2² = 6 × 4 = 24 cm².', tags: ['Geometry', 'Surface Area'] },
  { q: 'A rectangular box is 5 cm × 2 cm × 3 cm. Its volume is:', opts: ['10 cm³', '20 cm³', '30 cm³', '60 cm³'], a: 2, e: 'V = 5 × 2 × 3 = 30 cm³.', tags: ['Geometry', 'Volume'] },
  { q: 'The volume of a cube with side 4 cm is:', opts: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], a: 2, e: 'V = 4³ = 4 × 4 × 4 = 64 cm³.', tags: ['Geometry', 'Volume'] },
  { q: 'Using π ≈ 3.14, the volume of a cylinder with radius 2 cm and height 5 cm (V = π r^2 h) is:', opts: ['31.4 cm³', '62.8 cm³', '125.6 cm³', '20 cm³'], a: 1, e: 'V = 3.14 × 2² × 5 = 3.14 × 4 × 5 = 62.8 cm³.', tags: ['Geometry', 'Volume'] },
  { q: 'The surface area of a cube with side 5 cm is:', opts: ['25 cm²', '125 cm²', '150 cm²', '300 cm²'], a: 2, e: 'SA = 6 × 5² = 6 × 25 = 150 cm².', tags: ['Geometry', 'Surface Area'] },
  { q: 'A cube-shaped tank has edges of 10 cm. Its volume is:', opts: ['100 cm³', '600 cm³', '1000 cm³', '3000 cm³'], a: 2, e: 'V = 10³ = 10 × 10 × 10 = 1000 cm³.', tags: ['Geometry', 'Volume'] },

  // ── Level 8 — The Pythagorean Theorem ──
  { q: 'A right triangle has legs 3 cm and 4 cm. The hypotenuse (a² + b² = c²) is:', opts: ['5 cm', '6 cm', '7 cm', '12 cm'], a: 0, e: '3² + 4² = 9 + 16 = 25, and √25 = 5 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'A right triangle has legs 5 cm and 12 cm. The hypotenuse is:', opts: ['13 cm', '15 cm', '17 cm', '60 cm'], a: 0, e: '5² + 12² = 25 + 144 = 169, and √169 = 13 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'A right triangle has legs 6 cm and 8 cm. The hypotenuse is:', opts: ['7 cm', '10 cm', '12 cm', '14 cm'], a: 1, e: '6² + 8² = 36 + 64 = 100, and √100 = 10 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'A right triangle has hypotenuse 13 cm and one leg 5 cm. The other leg is:', opts: ['8 cm', '10 cm', '12 cm', '18 cm'], a: 2, e: '13² − 5² = 169 − 25 = 144, and √144 = 12 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'A right triangle has legs 8 cm and 15 cm. The hypotenuse is:', opts: ['16 cm', '17 cm', '20 cm', '23 cm'], a: 1, e: '8² + 15² = 64 + 225 = 289, and √289 = 17 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'A right triangle has legs 9 cm and 12 cm. The hypotenuse is:', opts: ['13 cm', '14 cm', '15 cm', '21 cm'], a: 2, e: '9² + 12² = 81 + 144 = 225, and √225 = 15 cm.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'In a right triangle, the hypotenuse is always:', opts: ['The shortest side', 'The side opposite the right angle', 'Equal to one leg', 'The vertical side'], a: 1, e: 'The hypotenuse is the longest side and lies opposite the right angle.', tags: ['Geometry', 'Pythagorean Theorem'] },
  { q: 'The Pythagorean theorem relates the sides of a right triangle as:', opts: ['a + b = c', 'a² + b² = c²', 'a² − b² = c²', 'a × b = c'], a: 1, e: 'For legs a, b and hypotenuse c, a² + b² = c².', tags: ['Geometry', 'Pythagorean Theorem'] },

  // ── Level 9 — Similarity & Congruence ──
  { q: 'Two figures that have the same shape AND the same size are called:', opts: ['Similar', 'Congruent', 'Parallel', 'Symmetric'], a: 1, e: 'Congruent figures match exactly in both shape and size.', tags: ['Geometry', 'Congruence'] },
  { q: 'Two figures with the same shape but different sizes are called:', opts: ['Congruent', 'Similar', 'Identical', 'Equal'], a: 1, e: 'Similar figures share the same shape with proportional sides.', tags: ['Geometry', 'Similarity'] },
  { q: 'A shape is enlarged by a scale factor of 2. A side of 5 cm becomes:', opts: ['2.5 cm', '7 cm', '10 cm', '25 cm'], a: 2, e: 'Multiply by the scale factor: 5 × 2 = 10 cm.', tags: ['Geometry', 'Similarity'] },
  { q: 'In two similar triangles, corresponding angles are:', opts: ['Equal', 'Supplementary', 'Doubled', 'Halved'], a: 0, e: 'Similar triangles have equal corresponding angles.', tags: ['Geometry', 'Similarity'] },
  { q: 'Which rule proves two triangles congruent using all three sides?', opts: ['SSS', 'AAA', 'SSA', 'None'], a: 0, e: 'SSS (side-side-side) proves congruence from three matching sides.', tags: ['Geometry', 'Congruence'] },
  { q: 'Two similar shapes have matching sides of 3 cm and 9 cm. The scale factor is:', opts: ['2', '3', '6', '27'], a: 1, e: 'Scale factor = 9 ÷ 3 = 3.', tags: ['Geometry', 'Similarity'] },
  { q: 'Two congruent figures always have:', opts: ['Different areas', 'Equal areas', 'Proportional areas', 'No relationship in area'], a: 1, e: 'Congruent figures are identical, so their areas are equal.', tags: ['Geometry', 'Congruence'] },
  { q: 'Two similar triangles have a side ratio of 1:2. Their area ratio is:', opts: ['1:2', '1:3', '1:4', '2:1'], a: 2, e: 'Area scales with the square of the ratio: 1² : 2² = 1:4.', tags: ['Geometry', 'Similarity'] },

  // ── Level 10 — Transformations ──
  { q: 'A transformation that slides a shape without turning or flipping it is a:', opts: ['Rotation', 'Reflection', 'Translation', 'Dilation'], a: 2, e: 'A translation slides every point the same distance and direction.', tags: ['Geometry', 'Transformations'] },
  { q: 'A transformation that turns a shape about a fixed point is a:', opts: ['Translation', 'Rotation', 'Reflection', 'Dilation'], a: 1, e: 'A rotation turns a shape around a center point.', tags: ['Geometry', 'Transformations'] },
  { q: 'A transformation that flips a shape over a line to make a mirror image is a:', opts: ['Reflection', 'Rotation', 'Translation', 'Dilation'], a: 0, e: 'A reflection produces a mirror image across a line.', tags: ['Geometry', 'Transformations'] },
  { q: 'Reflecting the point (3, 2) across the x-axis gives:', opts: ['(−3, 2)', '(3, −2)', '(−3, −2)', '(2, 3)'], a: 1, e: 'Reflecting across the x-axis negates the y-coordinate: (3, −2).', tags: ['Geometry', 'Transformations'] },
  { q: 'Rotating the point (x, y) by 180° about the origin gives:', opts: ['(y, x)', '(−x, y)', '(x, −y)', '(−x, −y)'], a: 3, e: 'A 180° rotation about the origin sends (x, y) to (−x, −y).', tags: ['Geometry', 'Transformations'] },
  { q: 'Which transformation does NOT change a shape\'s size or shape?', opts: ['Dilation with factor 2', 'Dilation with factor 3', 'Translation', 'Dilation with factor 1/2'], a: 2, e: 'A translation is a rigid motion, preserving size and shape.', tags: ['Geometry', 'Transformations'] },
  { q: 'Reflecting the point (5, −1) across the y-axis gives:', opts: ['(−5, −1)', '(5, 1)', '(−5, 1)', '(1, 5)'], a: 0, e: 'Reflecting across the y-axis negates the x-coordinate: (−5, −1).', tags: ['Geometry', 'Transformations'] },
  { q: 'Which transformation changes the size of a shape?', opts: ['Translation', 'Rotation', 'Reflection', 'Dilation'], a: 3, e: 'A dilation enlarges or shrinks a shape by a scale factor.', tags: ['Geometry', 'Transformations'] },
];
