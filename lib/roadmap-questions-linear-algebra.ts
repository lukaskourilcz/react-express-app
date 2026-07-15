// Linear Algebra roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const linearAlgebraSeeds: Seed[] = [
  // ── Level 1 — Vectors ──
  { q: 'Which statement best describes a vector?', opts: ['A quantity with both magnitude and direction', 'A quantity with magnitude only', 'A quantity with direction only', 'A quantity that is always positive'], a: 0, e: 'A vector carries both a magnitude (length) and a direction.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'What is the x-component of the vector (3, 4)?', opts: ['4', '3', '7', '5'], a: 1, e: 'The first entry of (3, 4) is the x-component, which is 3.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'How many components does the vector [1, 2, 3] have?', opts: ['2', '4', '3', '6'], a: 2, e: 'The vector [1, 2, 3] has three entries, so it is 3-dimensional.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'What is the zero vector in 2D?', opts: ['(1, 1)', '(0, 0)', '(0, 1)', '(1, 0)'], a: 1, e: 'The zero vector has every component equal to 0, so it is (0, 0).', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'Which of these is a unit vector (magnitude 1)?', opts: ['(1, 0)', '(1, 1)', '(2, 0)', '(3, 4)'], a: 0, e: 'The magnitude of (1, 0) is 1, so it is a unit vector.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'The vector (0, 5) points in which direction?', opts: ['Along the positive x-axis', 'Along the positive y-axis', 'Diagonally at 45 degrees', 'Along the negative y-axis'], a: 1, e: 'With zero x-component and positive y-component, (0, 5) points up the y-axis.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'Two vectors are equal exactly when:', opts: ['They have the same magnitude only', 'They have the same direction only', 'They have the same components', 'They start at the same point'], a: 2, e: 'Vectors are equal when all of their corresponding components match.', tags: ['Linear Algebra', 'Vectors'] },
  { q: 'What is the y-component of (-2, 7)?', opts: ['-2', '7', '5', '-7'], a: 1, e: 'The second entry of (-2, 7) is the y-component, which is 7.', tags: ['Linear Algebra', 'Vectors'] },

  // ── Level 2 — Vector Operations ──
  { q: '(1, 2) + (3, 4) = ?', opts: ['(4, 6)', '(3, 8)', '(4, 5)', '(2, 2)'], a: 0, e: 'Add componentwise: (1+3, 2+4) = (4, 6).', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: '2 · (3, -1) = ?', opts: ['(6, -2)', '(5, 1)', '(6, -1)', '(3, -2)'], a: 0, e: 'Scalar multiplication scales each component: (2·3, 2·(-1)) = (6, -2).', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: '(5, 3) - (2, 1) = ?', opts: ['(3, 2)', '(7, 4)', '(3, 4)', '(-3, -2)'], a: 0, e: 'Subtract componentwise: (5-2, 3-1) = (3, 2).', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: 'What is the magnitude of (3, 4)?', opts: ['7', '5', '12', '25'], a: 1, e: 'Magnitude is sqrt(3² + 4²) = sqrt(9 + 16) = sqrt(25) = 5.', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: 'What is the magnitude of (6, 8)?', opts: ['10', '14', '48', '100'], a: 0, e: 'Magnitude is sqrt(6² + 8²) = sqrt(36 + 64) = sqrt(100) = 10.', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: '3 · (1, 2, -1) = ?', opts: ['(3, 6, -3)', '(3, 5, 2)', '(4, 5, 2)', '(3, 6, -1)'], a: 0, e: 'Scale each component by 3: (3·1, 3·2, 3·(-1)) = (3, 6, -3).', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: '(2, 0) + (0, 3) = ?', opts: ['(2, 3)', '(0, 0)', '(2, 0)', '(5, 5)'], a: 0, e: 'Add componentwise: (2+0, 0+3) = (2, 3).', tags: ['Linear Algebra', 'Vector Operations'] },
  { q: 'A unit vector in the direction of (0, 4) is:', opts: ['(0, 1)', '(0, 4)', '(1, 0)', '(0, 2)'], a: 0, e: 'Divide by the magnitude 4: (0, 4)/4 = (0, 1).', tags: ['Linear Algebra', 'Vector Operations'] },

  // ── Level 3 — The Dot Product ──
  { q: '(1, 2) · (3, 4) = ?', opts: ['10', '11', '14', '7'], a: 1, e: 'The dot product is 1·3 + 2·4 = 3 + 8 = 11.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(2, 3) · (1, 4) = ?', opts: ['14', '11', '7', '24'], a: 0, e: 'The dot product is 2·1 + 3·4 = 2 + 12 = 14.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(1, 0) · (0, 1) = ?', opts: ['1', '0', '2', '-1'], a: 1, e: 'The dot product is 1·0 + 0·1 = 0, so these vectors are perpendicular.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(5, -2) · (3, 4) = ?', opts: ['23', '-7', '7', '8'], a: 2, e: 'The dot product is 5·3 + (-2)·4 = 15 - 8 = 7.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: 'If two nonzero vectors are perpendicular, their dot product is:', opts: ['1', '0', 'The product of their magnitudes', 'Undefined'], a: 1, e: 'Perpendicular vectors always have a dot product of 0.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(1, 2, 3) · (4, 5, 6) = ?', opts: ['32', '21', '28', '45'], a: 0, e: 'The dot product is 1·4 + 2·5 + 3·6 = 4 + 10 + 18 = 32.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(3, 4) · (3, 4) = ?', opts: ['5', '24', '25', '7'], a: 2, e: 'A vector dotted with itself gives 3·3 + 4·4 = 9 + 16 = 25, the magnitude squared.', tags: ['Linear Algebra', 'The Dot Product'] },
  { q: '(2, 2) · (-1, 1) = ?', opts: ['4', '0', '-4', '2'], a: 1, e: 'The dot product is 2·(-1) + 2·1 = -2 + 2 = 0, so the vectors are perpendicular.', tags: ['Linear Algebra', 'The Dot Product'] },

  // ── Level 4 — Matrices ──
  { q: 'What are the dimensions of the matrix [[1,2],[3,4]]?', opts: ['2×2', '2×3', '3×2', '4×1'], a: 0, e: 'It has 2 rows and 2 columns, so it is a 2×2 matrix.', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'In [[1,2,3],[4,5,6]], the entry in row 2, column 3 is:', opts: ['3', '5', '2', '6'], a: 3, e: 'Row 2 is [4,5,6] and its third entry is 6.', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'The 2×2 identity matrix is:', opts: ['[[1,0],[0,1]]', '[[0,1],[1,0]]', '[[1,1],[1,1]]', '[[0,0],[0,0]]'], a: 0, e: 'The identity has 1s on the main diagonal and 0s elsewhere: [[1,0],[0,1]].', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'A 3×2 matrix has how many entries?', opts: ['5', '6', '9', '8'], a: 1, e: 'The number of entries is rows × columns = 3 × 2 = 6.', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'The transpose of [[1,2],[3,4]] is:', opts: ['[[1,3],[2,4]]', '[[4,3],[2,1]]', '[[2,1],[4,3]]', '[[1,2],[3,4]]'], a: 0, e: 'The transpose swaps rows and columns, giving [[1,3],[2,4]].', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'A square matrix is one that has:', opts: ['An equal number of rows and columns', 'More rows than columns', 'Only one row', 'Only one column'], a: 0, e: 'A square matrix has the same number of rows as columns.', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'The main diagonal of [[7,2],[5,9]] consists of:', opts: ['2 and 5', '7 and 9', '7 and 2', '5 and 9'], a: 1, e: 'The main diagonal runs top-left to bottom-right: the entries 7 and 9.', tags: ['Linear Algebra', 'Matrices'] },
  { q: 'The matrix [[1,2,3]] is a:', opts: ['Column vector', 'Row vector', 'Square matrix', 'Zero matrix'], a: 1, e: 'A single row of entries is called a row vector.', tags: ['Linear Algebra', 'Matrices'] },

  // ── Level 5 — Matrix Multiplication ──
  { q: 'Multiplying a 2×3 matrix by a 3×4 matrix gives a matrix of size:', opts: ['2×4', '3×3', '2×3', '4×2'], a: 0, e: 'The result takes the outer dimensions: 2 rows and 4 columns, so 2×4.', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: 'Can you multiply matrix A (2×3) by matrix B (2×3)?', opts: ['Yes, always', 'No, the inner dimensions differ', 'Only if both are square', 'Only if they are equal'], a: 1, e: 'To multiply, the columns of A (3) must equal the rows of B (2); since 3 ≠ 2, it is undefined.', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: '[[1,0],[0,1]] × [[5,6],[7,8]] = ?', opts: ['[[5,6],[7,8]]', '[[6,5],[8,7]]', '[[1,0],[0,1]]', '[[5,7],[6,8]]'], a: 0, e: 'Multiplying by the identity leaves the other matrix unchanged.', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: '[[1,2],[3,4]] × [[1],[1]] = ?', opts: ['[3, 7]', '[4, 6]', '[1, 1]', '[7, 3]'], a: 0, e: 'Row 1 gives 1·1 + 2·1 = 3 and row 2 gives 3·1 + 4·1 = 7, so the result is [3, 7].', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: 'For general matrices, AB and BA are:', opts: ['Always equal', 'Not necessarily equal, since multiplication is not commutative', 'Always inverses of each other', 'Always the identity'], a: 1, e: 'Matrix multiplication is not commutative, so AB usually differs from BA.', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: 'The (1,1) entry of [[1,2],[3,4]] × [[5,6],[7,8]] is:', opts: ['19', '23', '5', '43'], a: 0, e: 'It is row 1 dotted with column 1: 1·5 + 2·7 = 5 + 14 = 19.', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: '[[2,0],[0,2]] × [[3,4],[5,6]] = ?', opts: ['[[6,8],[10,12]]', '[[5,6],[7,8]]', '[[3,4],[5,6]]', '[[6,4],[10,6]]'], a: 0, e: 'The matrix 2I scales every entry by 2, giving [[6,8],[10,12]].', tags: ['Linear Algebra', 'Matrix Multiplication'] },
  { q: 'The (2,1) entry of [[1,2],[3,4]] × [[5,6],[7,8]] is:', opts: ['31', '43', '23', '50'], a: 1, e: 'It is row 2 dotted with column 1: 3·5 + 4·7 = 15 + 28 = 43.', tags: ['Linear Algebra', 'Matrix Multiplication'] },

  // ── Level 6 — Determinants ──
  { q: 'det[[1,2],[3,4]] = ?', opts: ['2', '10', '-10', '-2'], a: 3, e: 'For [[a,b],[c,d]] the determinant is ad - bc = 1·4 - 2·3 = 4 - 6 = -2.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'The determinant of the 2×2 identity [[1,0],[0,1]] is:', opts: ['0', '1', '2', '-1'], a: 1, e: 'det = 1·1 - 0·0 = 1.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'det[[2,0],[0,3]] = ?', opts: ['5', '6', '0', '1'], a: 1, e: 'det = 2·3 - 0·0 = 6, the product of the diagonal for a diagonal matrix.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'For a 2×2 matrix [[a,b],[c,d]], the determinant equals:', opts: ['ad - bc', 'ab - cd', 'ac - bd', 'ad + bc'], a: 0, e: 'The 2×2 determinant formula is ad - bc.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'det[[3,1],[2,4]] = ?', opts: ['10', '14', '11', '5'], a: 0, e: 'det = 3·4 - 1·2 = 12 - 2 = 10.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'If a matrix has determinant 0, it is:', opts: ['Invertible', 'Singular (not invertible)', 'The identity', 'Symmetric'], a: 1, e: 'A zero determinant means the matrix is singular and has no inverse.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'det[[5,2],[3,1]] = ?', opts: ['1', '-1', '11', '-11'], a: 1, e: 'det = 5·1 - 2·3 = 5 - 6 = -1.', tags: ['Linear Algebra', 'Determinants'] },
  { q: 'det[[0,1],[1,0]] = ?', opts: ['1', '0', '-1', '2'], a: 2, e: 'det = 0·0 - 1·1 = -1.', tags: ['Linear Algebra', 'Determinants'] },

  // ── Level 7 — Matrix Inverses ──
  { q: 'The inverse of a matrix A satisfies:', opts: ['A · A⁻¹ = I', 'A · A⁻¹ = 0', 'A + A⁻¹ = I', 'A⁻¹ = Aᵀ'], a: 0, e: 'By definition, A times its inverse gives the identity matrix I.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'A 2×2 matrix is invertible exactly when its determinant is:', opts: ['Zero', 'Nonzero', 'Negative', 'Equal to one'], a: 1, e: 'A matrix is invertible if and only if its determinant is nonzero.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'The inverse of [[a,b],[c,d]] equals (1/det) times:', opts: ['[[d,-b],[-c,a]]', '[[a,b],[c,d]]', '[[d,b],[c,a]]', '[[-d,b],[c,-a]]'], a: 0, e: 'Swap a and d, negate b and c, then divide by the determinant.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'For [[1,2],[3,4]] with det = -2, the inverse is:', opts: ['[[-2, 1],[1.5, -0.5]]', '[[4, -2],[-3, 1]]', '[[2, -1],[-1.5, 0.5]]', '[[1, 2],[3, 4]]'], a: 0, e: '(1/-2)·[[4,-2],[-3,1]] = [[-2, 1],[1.5, -0.5]].', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'The inverse of the identity matrix is:', opts: ['The zero matrix', 'The identity matrix', 'Undefined', 'Its transpose only'], a: 1, e: 'Since I · I = I, the identity is its own inverse.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'Which matrix has no inverse?', opts: ['[[1,2],[2,4]]', '[[1,0],[0,1]]', '[[2,1],[1,1]]', '[[1,2],[3,4]]'], a: 0, e: 'det[[1,2],[2,4]] = 4 - 4 = 0, so it is singular and not invertible.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: 'The inverse of [[2,0],[0,4]] is:', opts: ['[[0.5, 0],[0, 0.25]]', '[[2, 0],[0, 4]]', '[[4, 0],[0, 2]]', '[[0.25, 0],[0, 0.5]]'], a: 0, e: 'For a diagonal matrix, invert each diagonal entry: 1/2 and 1/4.', tags: ['Linear Algebra', 'Matrix Inverses'] },
  { q: '(AB)⁻¹ equals:', opts: ['A⁻¹B⁻¹', 'B⁻¹A⁻¹', '(BA)⁻¹', 'AᵀBᵀ'], a: 1, e: 'The inverse of a product reverses the order: (AB)⁻¹ = B⁻¹A⁻¹.', tags: ['Linear Algebra', 'Matrix Inverses'] },

  // ── Level 8 — Systems as Matrices ──
  { q: 'The system 2x + y = 5, x - y = 1 as Ax = b uses A =', opts: ['[[2,1],[1,-1]]', '[[2,1],[1,1]]', '[[1,2],[-1,1]]', '[[2,-1],[1,1]]'], a: 0, e: 'The coefficient matrix uses the coefficients of x and y row by row: [[2,1],[1,-1]].', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'In the equation Ax = b, x represents:', opts: ['The coefficient matrix', 'The vector of unknowns', 'The constants', 'The determinant'], a: 1, e: 'x is the column vector holding the unknown variables.', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'If A is invertible, the solution of Ax = b is:', opts: ['x = A⁻¹b', 'x = Ab', 'x = b - A', 'x = bA⁻¹'], a: 0, e: 'Multiplying both sides by A⁻¹ gives x = A⁻¹b.', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'The augmented matrix for x + y = 3, x - y = 1 is:', opts: ['[[1,1,3],[1,-1,1]]', '[[1,1],[1,-1]]', '[[3,1],[1,1]]', '[[1,1,1],[1,1,3]]'], a: 0, e: 'Each row holds the coefficients and the constant: [[1,1,3],[1,-1,1]].', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'A system that has no solution is called:', opts: ['Consistent', 'Inconsistent', 'Homogeneous', 'Square'], a: 1, e: 'A system with no solution is described as inconsistent.', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'Solve x + y = 4 and x - y = 2. What is x?', opts: ['1', '2', '4', '3'], a: 3, e: 'Adding the equations gives 2x = 6, so x = 3 (and y = 1).', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'A homogeneous system Ax = 0 always has:', opts: ['No solution', 'The trivial solution x = 0', 'A unique nonzero solution', 'Infinitely many solutions always'], a: 1, e: 'x = 0 always satisfies Ax = 0, so the trivial solution always exists.', tags: ['Linear Algebra', 'Systems as Matrices'] },
  { q: 'If det(A) = 0, then Ax = b has:', opts: ['Exactly one solution always', 'Either no solution or infinitely many', 'Always infinitely many', 'Always exactly zero solutions'], a: 1, e: 'A singular matrix means the system has either no solution or infinitely many.', tags: ['Linear Algebra', 'Systems as Matrices'] },

  // ── Level 9 — Linear Transformations ──
  { q: 'A linear transformation T satisfies T(u + v) =', opts: ['T(u) · T(v)', 'T(u) + T(v)', 'T(u) - T(v)', 'u + v'], a: 1, e: 'Linearity requires T(u + v) = T(u) + T(v).', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'The matrix [[2,0],[0,2]] represents:', opts: ['Rotation by 90°', 'Scaling by a factor of 2', 'Reflection across the x-axis', 'A shear'], a: 1, e: 'Multiplying by 2I doubles every vector, which is uniform scaling by 2.', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'Rotation by 90° counterclockwise sends (1, 0) to:', opts: ['(0, 1)', '(0, -1)', '(-1, 0)', '(1, 0)'], a: 0, e: 'A 90° counterclockwise rotation turns (1, 0) into (0, 1).', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'The matrix [[1,0],[0,-1]] reflects vectors across the:', opts: ['y-axis', 'x-axis', 'line y = x', 'origin only'], a: 1, e: 'It negates the y-component while keeping x, which is a reflection across the x-axis.', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'A linear transformation always maps the origin to:', opts: ['Itself (the origin)', 'The point (1, 1)', 'Any point', 'Infinity'], a: 0, e: 'Since T(0) = 0 for any linear map, the origin stays fixed.', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'The matrix that scales x by 3 and y by 1 is:', opts: ['[[1,0],[0,3]]', '[[3,0],[0,3]]', '[[3,0],[0,1]]', '[[1,3],[0,1]]'], a: 2, e: 'The diagonal entries hold the scale factors: 3 for x and 1 for y.', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'Applying [[0,1],[1,0]] to (2, 5) gives:', opts: ['(2, 5)', '(-2, -5)', '(5, 2)', '(7, 7)'], a: 2, e: 'This matrix swaps the two components, turning (2, 5) into (5, 2).', tags: ['Linear Algebra', 'Linear Transformations'] },
  { q: 'The columns of a transformation matrix tell you:', opts: ['Where the basis vectors land', 'That it is always the identity', 'The eigenvalues', 'The determinant'], a: 0, e: 'Each column is the image of a standard basis vector under the transformation.', tags: ['Linear Algebra', 'Linear Transformations'] },

  // ── Level 10 — Eigenvalues & Eigenvectors ──
  { q: 'In the equation Av = λv, the scalar λ is called the:', opts: ['Eigenvector', 'Eigenvalue', 'Determinant', 'Trace'], a: 1, e: 'The scalar λ that scales v is the eigenvalue.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'If Av = λv with v ≠ 0, then v is:', opts: ['A scalar', 'An eigenvector', 'The zero vector', 'The inverse of A'], a: 1, e: 'A nonzero vector satisfying Av = λv is an eigenvector of A.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'The eigenvalues of [[2,0],[0,3]] are:', opts: ['5 and 6', '2 and 3', '0 and 0', '2 and 0'], a: 1, e: 'For a diagonal matrix, the eigenvalues are the diagonal entries: 2 and 3.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'Eigenvalues are found by solving:', opts: ['det(A - λI) = 0', 'A - λI = A', 'det(A) = λ', 'Av = 0'], a: 0, e: 'The eigenvalues are the roots of the characteristic equation det(A - λI) = 0.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'For [[3,0],[0,3]], every nonzero vector is an eigenvector with eigenvalue:', opts: ['0', '3', '6', '9'], a: 1, e: 'Since 3I sends every v to 3v, the eigenvalue is 3.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'The characteristic equation of [[2,1],[0,2]] gives eigenvalue(s):', opts: ['1 and 2', '0', '2 (repeated)', '3'], a: 2, e: 'For this triangular matrix, (2 - λ)² = 0 gives λ = 2 repeated.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'The sum of the eigenvalues of a matrix equals its:', opts: ['Determinant', 'Trace', 'Rank', 'Transpose'], a: 1, e: 'The eigenvalues sum to the trace (the sum of the diagonal entries).', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
  { q: 'The product of the eigenvalues of a matrix equals its:', opts: ['Trace', 'Sum of the diagonal', 'Determinant', 'Identity'], a: 2, e: 'The product of the eigenvalues equals the determinant of the matrix.', tags: ['Linear Algebra', 'Eigenvalues & Eigenvectors'] },
];
