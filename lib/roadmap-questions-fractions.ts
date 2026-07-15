// Fractions & Decimals roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const fractionsSeeds: Seed[] = [
  // ── Level 1 — Understanding Fractions ──
  { q: 'In the fraction 3/4, what is the numerator?', opts: ['4', '7', '3', '1'], a: 2, e: 'The numerator is the top number of a fraction, which is 3.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'In the fraction 5/8, what is the denominator?', opts: ['5', '8', '13', '3'], a: 1, e: 'The denominator is the bottom number of a fraction, which is 8.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'A shape is split into 4 equal parts and 1 part is shaded. What fraction is shaded?', opts: ['1/4', '4/1', '3/4', '1/3'], a: 0, e: 'One shaded part out of four equal parts is written 1/4.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'Which fraction represents one half?', opts: ['1/3', '2/1', '1/2', '1/4'], a: 2, e: 'One half means one of two equal parts, written 1/2.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'A pizza is cut into 6 equal slices and you eat 1 slice. What fraction did you eat?', opts: ['1/6', '6/1', '5/6', '1/5'], a: 0, e: 'One slice out of six equal slices is 1/6.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'Which of these is a proper fraction?', opts: ['5/3', '7/7', '2/9', '9/4'], a: 2, e: 'A proper fraction has a numerator smaller than its denominator, so 2/9 qualifies.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'What does the denominator of a fraction tell you?', opts: ['How many parts are shaded', 'The total number of equal parts in the whole', 'The larger number', 'How many wholes there are'], a: 1, e: 'The denominator shows how many equal parts the whole is divided into.', tags: ['Fractions', 'Understanding Fractions'] },
  { q: 'Which fraction is larger, 1/2 or 1/4?', opts: ['1/4', 'They are equal', '1/2', 'Cannot be told'], a: 2, e: 'With the same numerator, a smaller denominator means a larger fraction, so 1/2 is bigger.', tags: ['Fractions', 'Understanding Fractions'] },

  // ── Level 2 — Equivalent Fractions ──
  { q: 'Which fraction is equivalent to 1/2?', opts: ['2/3', '3/6', '1/3', '2/5'], a: 1, e: 'Multiplying 1/2 by 3/3 gives 3/6, so 3/6 = 1/2.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Simplify 4/8 to its simplest form.', opts: ['1/2', '2/4', '4/8', '1/4'], a: 0, e: 'Dividing top and bottom by 4 gives 1/2.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Fill in the blank: 2/3 = ?/9', opts: ['4', '5', '6', '3'], a: 2, e: 'Multiplying 2/3 by 3/3 gives 6/9, so the missing number is 6.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Simplify 6/9 to its simplest form.', opts: ['3/4', '2/3', '1/3', '6/9'], a: 1, e: 'Dividing top and bottom by 3 gives 2/3.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Which fraction is equivalent to 3/4?', opts: ['6/8', '4/5', '9/16', '2/3'], a: 0, e: 'Multiplying 3/4 by 2/2 gives 6/8, so 6/8 = 3/4.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Simplify 10/15 to its simplest form.', opts: ['5/3', '2/3', '3/5', '10/15'], a: 1, e: 'Dividing top and bottom by 5 gives 2/3.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Fill in the blank: 5/6 = 10/?', opts: ['11', '12', '16', '15'], a: 1, e: 'Multiplying 5/6 by 2/2 gives 10/12, so the missing number is 12.', tags: ['Fractions', 'Equivalent Fractions'] },
  { q: 'Which fraction is NOT equivalent to 1/3?', opts: ['2/6', '3/9', '4/12', '2/5'], a: 3, e: '2/5 equals 0.4 while 1/3 equals about 0.33, so 2/5 is not equivalent.', tags: ['Fractions', 'Equivalent Fractions'] },

  // ── Level 3 — Adding & Subtracting Fractions ──
  { q: 'What is 1/4 + 1/4?', opts: ['2/8', '1/2', '1/8', '3/4'], a: 1, e: 'Adding the numerators gives 2/4, which simplifies to 1/2.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 1/2 + 1/3?', opts: ['2/5', '5/6', '2/6', '1/6'], a: 1, e: 'Using a common denominator of 6, 3/6 + 2/6 = 5/6.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 3/5 - 1/5?', opts: ['2/5', '2/0', '4/5', '2/10'], a: 0, e: 'With the same denominator, subtract the numerators: 3 - 1 = 2, giving 2/5.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 2/3 - 1/6?', opts: ['1/3', '1/2', '1/6', '5/6'], a: 1, e: 'Rewriting 2/3 as 4/6, then 4/6 - 1/6 = 3/6 = 1/2.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 1/2 + 1/4?', opts: ['2/6', '3/4', '1/6', '2/4'], a: 1, e: 'Rewriting 1/2 as 2/4, then 2/4 + 1/4 = 3/4.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 5/6 - 1/3?', opts: ['1/2', '4/3', '1/3', '2/3'], a: 0, e: 'Rewriting 1/3 as 2/6, then 5/6 - 2/6 = 3/6 = 1/2.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 3/8 + 1/4?', opts: ['4/12', '5/8', '1/2', '4/8'], a: 1, e: 'Rewriting 1/4 as 2/8, then 3/8 + 2/8 = 5/8.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },
  { q: 'What is 7/10 - 2/5?', opts: ['5/5', '3/10', '1/2', '5/10'], a: 1, e: 'Rewriting 2/5 as 4/10, then 7/10 - 4/10 = 3/10.', tags: ['Fractions', 'Adding & Subtracting Fractions'] },

  // ── Level 4 — Multiplying & Dividing Fractions ──
  { q: 'What is 1/2 × 1/3?', opts: ['1/6', '2/3', '1/5', '3/2'], a: 0, e: 'Multiply numerators and denominators: (1×1)/(2×3) = 1/6.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 3/4 × 2/3?', opts: ['5/7', '6/7', '1/2', '5/12'], a: 2, e: 'Multiplying gives 6/12, which simplifies to 1/2.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 2/5 × 3/4?', opts: ['5/9', '3/10', '6/9', '1/2'], a: 1, e: 'Multiplying gives 6/20, which simplifies to 3/10.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 1/2 ÷ 1/4?', opts: ['1/8', '2', '1/2', '8'], a: 1, e: 'Dividing means multiplying by the reciprocal: 1/2 × 4/1 = 4/2 = 2.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 2/3 ÷ 1/6?', opts: ['4', '1/9', '2/18', '1/4'], a: 0, e: 'Multiply by the reciprocal: 2/3 × 6/1 = 12/3 = 4.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 3/4 ÷ 1/2?', opts: ['3/8', '3/2', '1/2', '2/3'], a: 1, e: 'Multiply by the reciprocal: 3/4 × 2/1 = 6/4 = 3/2.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 5/6 × 3/10?', opts: ['1/4', '8/16', '1/2', '15/16'], a: 0, e: 'Multiplying gives 15/60, which simplifies to 1/4.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },
  { q: 'What is 4/9 ÷ 2/3?', opts: ['8/27', '2/3', '6/9', '1/3'], a: 1, e: 'Multiply by the reciprocal: 4/9 × 3/2 = 12/18 = 2/3.', tags: ['Fractions', 'Multiplying & Dividing Fractions'] },

  // ── Level 5 — Mixed Numbers ──
  { q: 'Convert 2 1/2 to an improper fraction.', opts: ['5/2', '4/2', '3/2', '2/2'], a: 0, e: 'Multiply 2 by 2 and add 1 to get 5 over 2, so 5/2.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'Convert 7/2 to a mixed number.', opts: ['2 1/2', '3 1/2', '3 1/3', '7 1/2'], a: 1, e: '7 divided by 2 is 3 with remainder 1, giving 3 1/2.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'What is 1 1/4 + 1/4?', opts: ['1 1/2', '2 1/2', '1', '2'], a: 0, e: '1 1/4 is 5/4, and 5/4 + 1/4 = 6/4 = 1 1/2.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'Convert 3 2/3 to an improper fraction.', opts: ['9/3', '11/3', '8/3', '5/3'], a: 1, e: 'Multiply 3 by 3 and add 2 to get 11 over 3, so 11/3.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'What is 2 1/3 + 1 1/3?', opts: ['3 1/3', '3 2/3', '4', '3 2/6'], a: 1, e: 'Add the whole numbers (3) and the fractions (2/3) to get 3 2/3.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'What is 3 1/2 - 1 1/4?', opts: ['2 1/4', '2 1/2', '1 1/4', '2 3/4'], a: 0, e: 'Using improper fractions, 14/4 - 5/4 = 9/4 = 2 1/4.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'Convert 11/4 to a mixed number.', opts: ['2 1/4', '3 3/4', '2 3/4', '2 2/4'], a: 2, e: '11 divided by 4 is 2 with remainder 3, giving 2 3/4.', tags: ['Fractions', 'Mixed Numbers'] },
  { q: 'What is 2 × 1 1/2?', opts: ['2 1/2', '3', '2 1/4', '3 1/2'], a: 1, e: '1 1/2 is 3/2, and 2 × 3/2 = 6/2 = 3.', tags: ['Fractions', 'Mixed Numbers'] },

  // ── Level 6 — Decimal Basics ──
  { q: 'What is the place value of the 7 in 0.7?', opts: ['Tenths', 'Hundredths', 'Ones', 'Thousandths'], a: 0, e: 'The first digit after the decimal point is in the tenths place.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'How do you say 0.5 in words?', opts: ['Five tenths', 'Five hundredths', 'Five', 'Fifty'], a: 0, e: '0.5 has a 5 in the tenths place, so it is five tenths.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'Which decimal is larger, 0.3 or 0.25?', opts: ['0.25', 'They are equal', '0.3', 'Cannot be told'], a: 2, e: '0.3 is the same as 0.30, which is greater than 0.25.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'What is the place value of the 4 in 0.04?', opts: ['Tenths', 'Hundredths', 'Thousandths', 'Ones'], a: 1, e: 'The second digit after the decimal point is in the hundredths place.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'Which is the smallest: 0.1, 0.01, or 0.11?', opts: ['0.1', '0.11', '0.01', 'All equal'], a: 2, e: '0.01 is one hundredth, smaller than 0.1 and 0.11.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'Round 0.47 to the nearest tenth.', opts: ['0.4', '0.5', '0.47', '1.0'], a: 1, e: 'The hundredths digit is 7, so round the tenths up from 4 to 5, giving 0.5.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'Write 3/10 as a decimal.', opts: ['0.03', '0.3', '3.0', '0.13'], a: 1, e: 'Three tenths is written 0.3.', tags: ['Fractions', 'Decimal Basics'] },
  { q: 'Order 0.6, 0.06, and 0.66 from least to greatest.', opts: ['0.66, 0.6, 0.06', '0.06, 0.6, 0.66', '0.6, 0.06, 0.66', '0.06, 0.66, 0.6'], a: 1, e: '0.06 is smallest, then 0.6, then 0.66.', tags: ['Fractions', 'Decimal Basics'] },

  // ── Level 7 — Decimal Operations ──
  { q: 'What is 0.2 + 0.3?', opts: ['0.5', '0.05', '0.6', '0.23'], a: 0, e: 'Two tenths plus three tenths is five tenths, or 0.5.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 0.7 - 0.4?', opts: ['0.11', '0.3', '0.03', '1.1'], a: 1, e: 'Seven tenths minus four tenths is three tenths, or 0.3.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 0.5 × 0.2?', opts: ['1.0', '0.7', '0.1', '0.25'], a: 2, e: 'Multiplying gives 0.10, which is 0.1.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 0.6 ÷ 0.2?', opts: ['0.3', '3', '0.12', '30'], a: 1, e: 'How many 0.2s fit into 0.6? Exactly 3.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 1.25 + 0.75?', opts: ['1.100', '2', '1.9', '2.1'], a: 1, e: 'Adding the two decimals gives 2.00, which is 2.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 0.25 × 4?', opts: ['1', '0.1', '100', '0.29'], a: 0, e: 'Four quarters equal one whole, so 0.25 × 4 = 1.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 3.6 ÷ 3?', opts: ['1.2', '0.12', '12', '1.02'], a: 0, e: 'Dividing 3.6 by 3 gives 1.2.', tags: ['Fractions', 'Decimal Operations'] },
  { q: 'What is 0.9 - 0.35?', opts: ['0.65', '0.55', '0.45', '0.575'], a: 1, e: 'Writing 0.9 as 0.90, then 0.90 - 0.35 = 0.55.', tags: ['Fractions', 'Decimal Operations'] },

  // ── Level 8 — Fractions & Decimals ──
  { q: 'Write 1/4 as a decimal.', opts: ['0.14', '0.25', '0.4', '0.5'], a: 1, e: 'One quarter equals 0.25.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 0.75 as a fraction in simplest form.', opts: ['75/100', '7/5', '3/4', '3/5'], a: 2, e: '0.75 is 75/100, which simplifies to 3/4.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 3/5 as a decimal.', opts: ['0.35', '0.6', '0.53', '0.3'], a: 1, e: '3 divided by 5 equals 0.6.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 0.2 as a fraction in simplest form.', opts: ['2/10', '1/2', '1/5', '1/20'], a: 2, e: '0.2 is 2/10, which simplifies to 1/5.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 1/8 as a decimal.', opts: ['0.18', '0.125', '0.8', '0.15'], a: 1, e: '1 divided by 8 equals 0.125.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 0.5 as a fraction in simplest form.', opts: ['5/10', '1/2', '1/5', '2/5'], a: 1, e: '0.5 is 5/10, which simplifies to 1/2.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Which is larger, 0.7 or 3/5?', opts: ['3/5', 'They are equal', '0.7', 'Cannot be told'], a: 2, e: '3/5 equals 0.6, which is less than 0.7.', tags: ['Fractions', 'Fractions & Decimals'] },
  { q: 'Write 7/10 as a decimal.', opts: ['0.07', '0.7', '7.0', '0.17'], a: 1, e: 'Seven tenths is written 0.7.', tags: ['Fractions', 'Fractions & Decimals'] },

  // ── Level 9 — Percentages ──
  { q: 'What is 50% written as a fraction in simplest form?', opts: ['1/2', '1/5', '5/1', '1/50'], a: 0, e: '50% means 50 per 100, which simplifies to 1/2.', tags: ['Fractions', 'Percentages'] },
  { q: 'What is 25% of 80?', opts: ['25', '40', '20', '16'], a: 2, e: '25% is one quarter, and 80 ÷ 4 = 20.', tags: ['Fractions', 'Percentages'] },
  { q: 'Write 0.3 as a percentage.', opts: ['3%', '30%', '0.3%', '300%'], a: 1, e: 'Multiply by 100: 0.3 × 100 = 30%.', tags: ['Fractions', 'Percentages'] },
  { q: 'What is 10% of 250?', opts: ['25', '2.5', '250', '10'], a: 0, e: '10% is one tenth, and 250 ÷ 10 = 25.', tags: ['Fractions', 'Percentages'] },
  { q: 'What is 3/4 written as a percentage?', opts: ['34%', '75%', '43%', '30%'], a: 1, e: '3/4 equals 0.75, which is 75%.', tags: ['Fractions', 'Percentages'] },
  { q: 'What is 20% of 50?', opts: ['20', '10', '30', '25'], a: 1, e: '20% is one fifth, and 50 ÷ 5 = 10.', tags: ['Fractions', 'Percentages'] },
  { q: 'A shirt costs $40 and is 25% off. What is the discount amount?', opts: ['$25', '$15', '$10', '$30'], a: 2, e: '25% of $40 is $10, so the discount is $10.', tags: ['Fractions', 'Percentages'] },
  { q: 'What is 100% of 45?', opts: ['0', '45', '100', '90'], a: 1, e: '100% means the whole amount, which is 45.', tags: ['Fractions', 'Percentages'] },

  // ── Level 10 — Ratios & Proportions ──
  { q: 'Simplify the ratio 4:8.', opts: ['1:2', '2:1', '4:8', '1:4'], a: 0, e: 'Dividing both parts by 4 gives 1:2.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'If 2:3 = 4:?, what is the missing number?', opts: ['5', '6', '8', '9'], a: 1, e: 'Both parts double, so 3 becomes 6.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'Simplify the ratio 10:15.', opts: ['5:3', '2:3', '3:2', '10:15'], a: 1, e: 'Dividing both parts by 5 gives 2:3.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'A recipe uses 2 cups of flour to 1 cup of sugar. For 6 cups of flour, how much sugar is needed?', opts: ['2 cups', '3 cups', '6 cups', '4 cups'], a: 1, e: 'The flour tripled from 2 to 6, so the sugar triples from 1 to 3 cups.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'Share $20 in the ratio 1:3. What is the larger share?', opts: ['$5', '$10', '$15', '$12'], a: 2, e: 'There are 4 parts of $5 each, and the larger share is 3 × $5 = $15.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'If 3:5 = ?:20, what is the missing number?', opts: ['12', '15', '8', '6'], a: 0, e: '5 was multiplied by 4 to get 20, so 3 × 4 = 12.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'The ratio of boys to girls is 3:2. If there are 15 boys, how many girls are there?', opts: ['10', '5', '12', '9'], a: 0, e: '15 boys is 5 groups of 3, so there are 5 groups of 2 girls, giving 10.', tags: ['Fractions', 'Ratios & Proportions'] },
  { q: 'Simplify the ratio 12:18.', opts: ['3:2', '2:3', '6:9', '4:6'], a: 1, e: 'Dividing both parts by 6 gives 2:3.', tags: ['Fractions', 'Ratios & Proportions'] },
];
