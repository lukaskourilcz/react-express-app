// Statistics & Probability roadmap questions (80): 10 levels × 8, easiest → hardest.
import type { Seed } from './roadmap-build';

export const statisticsSeeds: Seed[] = [
  // ── Level 1 — Data & Its Types ──
  { q: 'Which of the following is an example of qualitative (categorical) data?', opts: ['Eye color', 'Height in cm', 'Number of siblings', 'Weight in kg'], a: 0, e: 'Eye color names a category and has no numeric value, so it is qualitative.', tags: ['Statistics', 'Data'] },
  { q: 'Which of the following is an example of quantitative data?', opts: ['Favorite color', 'Type of pet', 'Number of pets', 'Country of birth'], a: 2, e: 'Number of pets is a count, so it is quantitative (numeric) data.', tags: ['Statistics', 'Data'] },
  { q: 'Which of these is discrete data?', opts: ['The number of students in a class', 'A person\'s exact height', 'The time to run a race', 'The temperature outside'], a: 0, e: 'A count of students takes only whole-number values, so it is discrete.', tags: ['Statistics', 'Data'] },
  { q: 'Which of these is continuous data?', opts: ['Number of cars in a lot', 'The weight of a package', 'Number of goals scored', 'Number of pages in a book'], a: 1, e: 'Weight can take any value on a scale, so it is continuous data.', tags: ['Statistics', 'Data'] },
  { q: 'Which of these is an example of ordinal data?', opts: ['Survey ratings: poor, fair, good, excellent', 'Blood types: A, B, AB, O', 'Postal codes', 'Jersey numbers'], a: 0, e: 'Ratings have a meaningful order but no fixed numeric spacing, so they are ordinal.', tags: ['Statistics', 'Data'] },
  { q: 'Which of these is nominal data (categories with no natural order)?', opts: ['Race finishing positions', 'T-shirt sizes S, M, L', 'Types of fruit', 'Class grades A to F'], a: 2, e: 'Types of fruit are unordered categories, which makes them nominal data.', tags: ['Statistics', 'Data'] },
  { q: 'A researcher surveys 200 students out of the 5,000 at a school. The 200 students are the...', opts: ['Population', 'Sample', 'Parameter', 'Census'], a: 1, e: 'A subset selected from the whole group is called a sample.', tags: ['Statistics', 'Data'] },
  { q: 'A numeric value that describes an entire population is called a...', opts: ['Statistic', 'Sample', 'Parameter', 'Variable'], a: 2, e: 'A parameter describes a population; a statistic describes a sample.', tags: ['Statistics', 'Data'] },

  // ── Level 2 — Mean, Median & Mode ──
  { q: 'What is the mean of the data set {2, 4, 6}?', opts: ['3', '4', '6', '12'], a: 1, e: 'The mean is (2 + 4 + 6) / 3 = 12 / 3 = 4.', tags: ['Statistics', 'Averages'] },
  { q: 'What is the median of the data set {1, 3, 7, 9}?', opts: ['3', '4', '5', '7'], a: 2, e: 'With four values, the median is the average of the middle two: (3 + 7) / 2 = 5.', tags: ['Statistics', 'Averages'] },
  { q: 'What is the mode of the data set {2, 3, 3, 5, 7}?', opts: ['2', '3', '5', '7'], a: 1, e: 'The mode is the most frequent value, and 3 appears twice.', tags: ['Statistics', 'Averages'] },
  { q: 'What is the mean of the data set {5, 10, 15, 20}?', opts: ['10', '12.5', '15', '50'], a: 1, e: 'The mean is (5 + 10 + 15 + 20) / 4 = 50 / 4 = 12.5.', tags: ['Statistics', 'Averages'] },
  { q: 'What is the median of the data set {4, 8, 15, 16, 23, 42}?', opts: ['15', '15.5', '16', '19'], a: 1, e: 'The middle two values are 15 and 16, so the median is (15 + 16) / 2 = 15.5.', tags: ['Statistics', 'Averages'] },
  { q: 'Which measure of center is most affected by an outlier?', opts: ['Mean', 'Median', 'Mode', 'The mode and median equally'], a: 0, e: 'The mean uses every value, so a single extreme value shifts it the most.', tags: ['Statistics', 'Averages'] },
  { q: 'What is the mean of the data set {3, 3, 4, 7, 8}?', opts: ['4', '5', '7', '25'], a: 1, e: 'The mean is (3 + 3 + 4 + 7 + 8) / 5 = 25 / 5 = 5.', tags: ['Statistics', 'Averages'] },
  { q: 'A data set of 5 values has a mean of 10. What is the sum of all the values?', opts: ['2', '15', '50', '5'], a: 2, e: 'Sum = mean × count = 10 × 5 = 50.', tags: ['Statistics', 'Averages'] },

  // ── Level 3 — Range & Spread ──
  { q: 'What is the range of the data set {3, 7, 2, 9, 5}?', opts: ['5', '7', '9', '11'], a: 1, e: 'Range = maximum − minimum = 9 − 2 = 7.', tags: ['Statistics', 'Spread'] },
  { q: 'What is the range of the data set {12, 15, 20, 8, 25}?', opts: ['13', '17', '20', '25'], a: 1, e: 'Range = 25 − 8 = 17.', tags: ['Statistics', 'Spread'] },
  { q: 'For the ordered data {1, 2, 3, 4, 5, 6, 7, 8}, what is the first quartile Q1?', opts: ['2', '2.5', '3', '4.5'], a: 1, e: 'Q1 is the median of the lower half {1, 2, 3, 4}, which is (2 + 3) / 2 = 2.5.', tags: ['Statistics', 'Spread'] },
  { q: 'The interquartile range is Q3 − Q1. If Q1 = 10 and Q3 = 25, what is the IQR?', opts: ['10', '15', '25', '35'], a: 1, e: 'IQR = Q3 − Q1 = 25 − 10 = 15.', tags: ['Statistics', 'Spread'] },
  { q: 'For the ordered data {2, 4, 6, 8, 10, 12}, what is the third quartile Q3?', opts: ['8', '9', '10', '11'], a: 2, e: 'Q3 is the median of the upper half {8, 10, 12}, which is 10.', tags: ['Statistics', 'Spread'] },
  { q: 'Which of these measures the spread of data rather than its center?', opts: ['Mean', 'Median', 'Mode', 'Range'], a: 3, e: 'The range measures how spread out the data are; the others measure center.', tags: ['Statistics', 'Spread'] },
  { q: 'What is the range of the data set {5, 5, 5, 5}?', opts: ['0', '5', '20', '1'], a: 0, e: 'All values are equal, so range = 5 − 5 = 0.', tags: ['Statistics', 'Spread'] },
  { q: 'An outlier is often flagged below Q1 − 1.5 × IQR. If Q1 = 20 and IQR = 20, what is this lower fence?', opts: ['-10', '10', '0', '-30'], a: 0, e: 'Lower fence = Q1 − 1.5 × IQR = 20 − 1.5 × 20 = 20 − 30 = −10.', tags: ['Statistics', 'Spread'] },

  // ── Level 4 — Standard Deviation ──
  { q: 'What does the standard deviation of a data set measure?', opts: ['The center of the data', 'The spread of the data around the mean', 'The most frequent value', 'The middle value'], a: 1, e: 'Standard deviation measures how far values typically lie from the mean.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'The variance of a data set is best described as...', opts: ['The square root of the standard deviation', 'The average of the squared deviations from the mean', 'The range squared', 'The mean of the data'], a: 1, e: 'Variance is the mean of the squared differences between each value and the mean.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'If the variance of a data set is 16, what is its standard deviation?', opts: ['4', '8', '16', '256'], a: 0, e: 'Standard deviation is the square root of the variance: √16 = 4.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'What is the population standard deviation of the data set {2, 4, 4, 4, 5, 5, 7, 9}?', opts: ['2', '4', '32', '5'], a: 0, e: 'The mean is 5 and the mean squared deviation (variance) is 32 / 8 = 4, so σ = √4 = 2.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'What is the population standard deviation of the data set {4, 8}?', opts: ['2', '4', '6', '8'], a: 0, e: 'The mean is 6, deviations are ±2, variance = (4 + 4) / 2 = 4, so σ = √4 = 2.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'A data set in which every value is identical has a standard deviation of...', opts: ['0', '1', 'The mean', 'Undefined'], a: 0, e: 'With no variation, every deviation from the mean is 0, so σ = 0.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'Which data set has the larger standard deviation: {10, 10, 10} or {0, 10, 20}?', opts: ['{10, 10, 10}', '{0, 10, 20}', 'They are equal', 'Cannot be determined'], a: 1, e: '{0, 10, 20} has values spread far from the mean, while {10, 10, 10} has no spread.', tags: ['Statistics', 'Standard Deviation'] },
  { q: 'What is the population variance of the data set {1, 2, 3, 4, 5}?', opts: ['2', '2.5', '10', '1.41'], a: 0, e: 'The mean is 3, the squared deviations sum to 10, and variance = 10 / 5 = 2.', tags: ['Statistics', 'Standard Deviation'] },

  // ── Level 5 — Data Displays ──
  { q: 'Which display is best for showing the parts of a whole as percentages of a total?', opts: ['Pie chart', 'Line graph', 'Scatter plot', 'Histogram'], a: 0, e: 'A pie chart divides a circle into slices that represent proportions of a whole.', tags: ['Statistics', 'Displays'] },
  { q: 'Which display is best for showing a trend over time?', opts: ['Pie chart', 'Line graph', 'Bar chart', 'Stem-and-leaf plot'], a: 1, e: 'A line graph connects points over time, making trends easy to see.', tags: ['Statistics', 'Displays'] },
  { q: 'Which display best shows the relationship between two numeric variables?', opts: ['Scatter plot', 'Pie chart', 'Bar chart', 'Histogram'], a: 0, e: 'A scatter plot plots paired values to reveal a relationship between two variables.', tags: ['Statistics', 'Displays'] },
  { q: 'A histogram is used mainly to display...', opts: ['The distribution of a numeric variable', 'Categorical proportions', 'Change over time', 'Correlation between two variables'], a: 0, e: 'A histogram groups numeric data into bins to show its distribution.', tags: ['Statistics', 'Displays'] },
  { q: 'In a box plot, the line inside the box represents the...', opts: ['Mean', 'Median', 'Mode', 'Range'], a: 1, e: 'The line inside a box plot marks the median of the data.', tags: ['Statistics', 'Displays'] },
  { q: 'In a box plot, the box itself spans from...', opts: ['Minimum to maximum', 'Q1 to Q3', 'Mean minus SD to mean plus SD', 'Median to mean'], a: 1, e: 'The box stretches from the first quartile (Q1) to the third quartile (Q3).', tags: ['Statistics', 'Displays'] },
  { q: 'In a stem-and-leaf plot, a stem of 3 with leaves 2, 5, 7 represents which values?', opts: ['3, 2, 5, 7', '32, 35, 37', '23, 53, 73', '3.2, 3.5, 3.7'], a: 1, e: 'The stem is the tens digit and each leaf is a ones digit, giving 32, 35, and 37.', tags: ['Statistics', 'Displays'] },
  { q: 'A frequency table lists the value 5 with a frequency of 3. This means...', opts: ['The value 5 appears 3 times', 'The value 3 appears 5 times', '5 is the mean', 'The total of the data is 5'], a: 0, e: 'Frequency is how many times a value occurs, so 5 occurs 3 times.', tags: ['Statistics', 'Displays'] },

  // ── Level 6 — Basic Probability ──
  { q: 'What is the probability of rolling a 6 on a fair six-sided die?', opts: ['1/2', '1/6', '6', '1/12'], a: 1, e: 'There is 1 favorable outcome out of 6 equally likely outcomes, so P = 1/6.', tags: ['Statistics', 'Probability'] },
  { q: 'What is the probability of getting heads on a single flip of a fair coin?', opts: ['1/4', '1/2', '1', '2'], a: 1, e: 'A fair coin has 2 equally likely outcomes, so P(heads) = 1/2.', tags: ['Statistics', 'Probability'] },
  { q: 'What is the probability of drawing a red card from a standard 52-card deck?', opts: ['1/4', '1/2', '1/13', '1/26'], a: 1, e: 'There are 26 red cards out of 52, so P = 26/52 = 1/2.', tags: ['Statistics', 'Probability'] },
  { q: 'What is the probability of rolling an even number on a fair six-sided die?', opts: ['1/6', '1/3', '1/2', '2/3'], a: 2, e: 'The even outcomes are 2, 4, and 6, so P = 3/6 = 1/2.', tags: ['Statistics', 'Probability'] },
  { q: 'What is the probability of drawing an ace from a standard 52-card deck?', opts: ['1/13', '1/4', '1/52', '4/13'], a: 0, e: 'There are 4 aces out of 52 cards, so P = 4/52 = 1/13.', tags: ['Statistics', 'Probability'] },
  { q: 'A probability value must always lie between which two numbers?', opts: ['0 and 1', '-1 and 1', '0 and 100', '1 and 6'], a: 0, e: 'Probabilities range from 0 (impossible) to 1 (certain).', tags: ['Statistics', 'Probability'] },
  { q: 'If P(A) = 0.3, what is P(not A)?', opts: ['0.3', '0.7', '1.3', '0.07'], a: 1, e: 'The complement is 1 − P(A) = 1 − 0.3 = 0.7.', tags: ['Statistics', 'Probability'] },
  { q: 'A bag holds 3 red and 2 blue marbles. What is the probability of drawing a red marble?', opts: ['2/5', '3/5', '1/2', '3/2'], a: 1, e: 'There are 3 red out of 5 total marbles, so P(red) = 3/5.', tags: ['Statistics', 'Probability'] },

  // ── Level 7 — Compound Probability ──
  { q: 'What is the probability of getting two heads when flipping two fair coins?', opts: ['1/2', '1/4', '1/8', '1/3'], a: 1, e: 'The flips are independent, so P = 1/2 × 1/2 = 1/4.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'What is the probability of rolling two 6s when rolling two fair dice?', opts: ['1/12', '1/36', '2/6', '1/6'], a: 1, e: 'The rolls are independent, so P = 1/6 × 1/6 = 1/36.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'What is the probability of getting heads then tails on two coin flips?', opts: ['1/2', '1/4', '1/8', '3/4'], a: 1, e: 'P(heads) × P(tails) = 1/2 × 1/2 = 1/4.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'When rolling two fair dice, what is the probability that the sum is 7?', opts: ['1/6', '1/12', '7/36', '1/9'], a: 0, e: 'There are 6 ways to make a sum of 7 out of 36 outcomes, so P = 6/36 = 1/6.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'Events A and B are mutually exclusive with P(A) = 0.2 and P(B) = 0.3. What is P(A or B)?', opts: ['0.06', '0.5', '0.1', '0.25'], a: 1, e: 'For mutually exclusive events, P(A or B) = P(A) + P(B) = 0.2 + 0.3 = 0.5.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'What is the probability of drawing 2 aces in a row from a 52-card deck without replacement?', opts: ['1/221', '1/169', '1/13', '2/52'], a: 0, e: 'P = 4/52 × 3/51 = 12/2652 = 1/221.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'What is the probability of getting at least one head in two flips of a fair coin?', opts: ['1/4', '1/2', '3/4', '1'], a: 2, e: 'P(at least one head) = 1 − P(no heads) = 1 − 1/4 = 3/4.', tags: ['Statistics', 'Compound Probability'] },
  { q: 'A and B are independent with P(A) = 0.5 and P(B) = 0.4. What is P(A and B)?', opts: ['0.9', '0.2', '0.1', '0.45'], a: 1, e: 'For independent events, P(A and B) = P(A) × P(B) = 0.5 × 0.4 = 0.2.', tags: ['Statistics', 'Compound Probability'] },

  // ── Level 8 — Permutations & Combinations ──
  { q: 'What is the value of 5C2 (choosing 2 from 5)?', opts: ['10', '20', '25', '7'], a: 0, e: '5C2 = 5! / (2! × 3!) = 120 / 12 = 10.', tags: ['Statistics', 'Counting'] },
  { q: 'What is the value of 5P2 (arranging 2 from 5)?', opts: ['10', '20', '25', '7'], a: 1, e: '5P2 = 5 × 4 = 20, since order matters.', tags: ['Statistics', 'Counting'] },
  { q: 'How many ways can 4 distinct books be arranged in a row?', opts: ['12', '16', '24', '4'], a: 2, e: 'The number of arrangements is 4! = 4 × 3 × 2 × 1 = 24.', tags: ['Statistics', 'Counting'] },
  { q: 'What is the value of 6C3 (choosing 3 from 6)?', opts: ['18', '20', '120', '40'], a: 1, e: '6C3 = 6! / (3! × 3!) = 720 / 36 = 20.', tags: ['Statistics', 'Counting'] },
  { q: 'Which counting method is used when the order of selection matters?', opts: ['Combination', 'Permutation', 'Frequency', 'Proportion'], a: 1, e: 'Permutations count ordered arrangements; combinations ignore order.', tags: ['Statistics', 'Counting'] },
  { q: 'How many ways can a committee of 3 be chosen from 5 people (order does not matter)?', opts: ['10', '60', '15', '20'], a: 0, e: 'This is 5C3 = 5! / (3! × 2!) = 120 / 12 = 10.', tags: ['Statistics', 'Counting'] },
  { q: 'What is the value of 4P2 (arranging 2 from 4)?', opts: ['6', '8', '12', '16'], a: 2, e: '4P2 = 4 × 3 = 12, since order matters.', tags: ['Statistics', 'Counting'] },
  { q: 'What is the value of 0! (zero factorial)?', opts: ['0', '1', 'Undefined', '10'], a: 1, e: 'By definition, 0! = 1.', tags: ['Statistics', 'Counting'] },

  // ── Level 9 — Distributions ──
  { q: 'In a perfectly normal distribution, the mean, median, and mode are...', opts: ['All equal', 'All different', 'Always 0', 'Undefined'], a: 0, e: 'A normal distribution is symmetric, so its mean, median, and mode coincide.', tags: ['Statistics', 'Distributions'] },
  { q: 'The normal distribution is best described as...', opts: ['Symmetric and bell-shaped', 'Skewed to the right', 'Uniform', 'U-shaped'], a: 0, e: 'The normal curve is symmetric and shaped like a bell.', tags: ['Statistics', 'Distributions'] },
  { q: 'By the empirical rule, approximately what percent of data lies within 1 standard deviation of the mean?', opts: ['50%', '68%', '95%', '99.7%'], a: 1, e: 'About 68% of a normal distribution falls within ±1σ of the mean.', tags: ['Statistics', 'Distributions'] },
  { q: 'By the empirical rule, approximately what percent of data lies within 2 standard deviations of the mean?', opts: ['68%', '95%', '99.7%', '50%'], a: 1, e: 'About 95% of a normal distribution falls within ±2σ of the mean.', tags: ['Statistics', 'Distributions'] },
  { q: 'A distribution with a long tail stretching to the right is called...', opts: ['Right-skewed (positively skewed)', 'Left-skewed', 'Symmetric', 'Uniform'], a: 0, e: 'A long right tail indicates a right-skewed (positively skewed) distribution.', tags: ['Statistics', 'Distributions'] },
  { q: 'In a right-skewed distribution, the mean is usually...', opts: ['Greater than the median', 'Less than the median', 'Equal to the median', 'Equal to the mode'], a: 0, e: 'The long right tail pulls the mean above the median in a right-skewed distribution.', tags: ['Statistics', 'Distributions'] },
  { q: 'For the standard normal distribution, the mean μ and standard deviation σ are...', opts: ['μ = 0, σ = 1', 'μ = 1, σ = 0', 'μ = 0, σ = 0', 'μ = 1, σ = 1'], a: 0, e: 'The standard normal distribution is defined with μ = 0 and σ = 1.', tags: ['Statistics', 'Distributions'] },
  { q: 'By the empirical rule, approximately what percent of data lies within 3 standard deviations of the mean?', opts: ['68%', '95%', '99.7%', '100%'], a: 2, e: 'About 99.7% of a normal distribution falls within ±3σ of the mean.', tags: ['Statistics', 'Distributions'] },

  // ── Level 10 — Correlation & Inference ──
  { q: 'A correlation coefficient r always lies between which two values?', opts: ['0 and 1', '-1 and 1', '0 and 100', '-100 and 100'], a: 1, e: 'The correlation coefficient r ranges from −1 to +1.', tags: ['Statistics', 'Inference'] },
  { q: 'A correlation coefficient of r = 0.9 indicates...', opts: ['No correlation', 'A weak positive correlation', 'A strong positive correlation', 'A strong negative correlation'], a: 2, e: 'An r close to +1 means a strong positive linear relationship.', tags: ['Statistics', 'Inference'] },
  { q: 'A correlation coefficient of r = -0.85 indicates...', opts: ['A strong positive correlation', 'A strong negative correlation', 'No relationship', 'A weak negative correlation'], a: 1, e: 'An r close to −1 means a strong negative linear relationship.', tags: ['Statistics', 'Inference'] },
  { q: 'A correlation coefficient of r = 0 indicates...', opts: ['A perfect positive correlation', 'No linear correlation', 'A perfect negative correlation', 'A strong correlation'], a: 1, e: 'An r of 0 means there is no linear relationship between the variables.', tags: ['Statistics', 'Inference'] },
  { q: 'A key principle of statistics is that correlation does not imply...', opts: ['Association', 'A relationship', 'Causation', 'A pattern'], a: 2, e: 'Two variables can be correlated without one causing the other.', tags: ['Statistics', 'Inference'] },
  { q: 'If a p-value is less than the significance level (for example 0.05), we...', opts: ['Accept the null hypothesis', 'Reject the null hypothesis', 'Prove the alternative is true', 'Ignore the result'], a: 1, e: 'A p-value below the significance level leads us to reject the null hypothesis.', tags: ['Statistics', 'Inference'] },
  { q: 'As the sample size increases, the margin of error generally...', opts: ['Increases', 'Decreases', 'Stays exactly the same', 'Becomes 1'], a: 1, e: 'Larger samples give more precise estimates, shrinking the margin of error.', tags: ['Statistics', 'Inference'] },
  { q: 'The null hypothesis in a test typically states that...', opts: ['There is a significant effect', 'There is no effect or difference', 'The sample is biased', 'The mean is 1'], a: 1, e: 'The null hypothesis assumes no effect or no difference by default.', tags: ['Statistics', 'Inference'] },
];
