import { questions } from '../lib/quiz-data';
import { CODING_TASKS } from '../lib/coding/catalog';
import { questionEligibility } from '../lib/curation';
import { AUDITED_CATEGORIES, REGISTRY_AUDITED_ON, REVIEW_REGISTRY } from '../lib/curation-registry';

const stripCode = (value: string): string => value.replace(/```[\s\S]*?```/g, ' ');
const words = (value: string): number => stripCode(value).trim().split(/\s+/).filter(Boolean).length;
const boilerplate = /\b(mastering|realm|delve|leverage|utilize|seamless|supercharge|game-changing)\b/i;
// "X is one of" alone catches real hints — "x is one of two things", "This is
// one of TypeScript's four built-in string-manipulation types" — so it wants
// the article that the filler shape ("one of the most important concepts")
// always carries and a specific hint rarely does.
const genericIntros = /^(understanding|this question|this concept|in (modern|today's)|\w+ is (one of the|a common)|knowing how)/i;
const unseriousDistractor = /\b(cpu temperature|physical coin|color scheme|developer(?:'s|’s) mood|make buttons blue|random chance|magic happens|faster css|slow css)\b/i;

const ids = new Set<string>();
for (const question of questions) {
  if (ids.has(question.id)) throw new Error(`Duplicate active devShark question id: ${question.id}`);
  ids.add(question.id);
  if (!question.question.trim() || !question.introduction.trim() || !question.explanation.trim()) {
    throw new Error(`Incomplete active devShark question: ${question.id}`);
  }
  if (question.options.length !== 4 || question.options.some((option) => !option.trim())) {
    throw new Error(`Invalid options for active devShark question: ${question.id}`);
  }
  if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    throw new Error(`Invalid accepted answer for active devShark question: ${question.id}`);
  }
}

const categoryCounts = Object.entries(Object.groupBy(questions, (question) => question.category))
  .map(([category, entries]) => ({ category, count: entries?.length ?? 0 }))
  .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

const questionFlags = questions.flatMap((question) => {
  const flags: string[] = [];
  if (words(question.introduction) > 28) flags.push(`long intro (${words(question.introduction)} words)`);
  // The audit deliberately lengthened explanations: a reviewed one states the
  // rule and then says why each wrong answer is wrong, which costs roughly
  // sixty to eighty words on a four-option item. At the old threshold of 55
  // this fired on 71% of the bank and meant nothing. The median is now 64 and
  // the 99th percentile 102, so 100 keeps the long tail worth reading.
  if (words(question.explanation) > 100) flags.push(`long explanation (${words(question.explanation)} words)`);
  if (boilerplate.test(question.introduction)) flags.push('AI-like intro language');
  if (genericIntros.test(question.introduction)) flags.push('templated intro');

  const correctLength = words(question.options[question.correctAnswer] ?? '');
  const distractorLengths = question.options
    .filter((_, index) => index !== question.correctAnswer)
    .map(words);
  const averageDistractor = distractorLengths.reduce((sum, count) => sum + count, 0) / Math.max(1, distractorLengths.length);
  if (correctLength >= 10 && correctLength >= averageDistractor * 4) flags.push('correct answer is much more detailed');
  if (question.options.some((option, index) => index !== question.correctAnswer && unseriousDistractor.test(option))) {
    flags.push('unserious distractor');
  }
  if (question.id.startsWith('abbr-')) flags.push('legacy abbreviation item');
  return flags.length > 0 ? [{ id: question.id, category: question.category, flags, question: stripCode(question.question).trim(), options: question.options, correctAnswer: question.correctAnswer }] : [];
});

const taskFlags = CODING_TASKS.flatMap((task) => {
  const flags: string[] = [];
  if (words(task.prompt.en) > 90) flags.push(`long prompt (${words(task.prompt.en)} words)`);
  if (boilerplate.test(task.prompt.en)) flags.push('AI-like prompt language');
  if (task.hints.en.some((hint) => words(hint) > 38)) flags.push('long hint');
  if (task.design?.steps.some((step) => step.explanation.en.split(/\s+/).length > 90)) flags.push('long design explanation');
  return flags.length > 0 ? [{ id: task.id, track: task.track, flags, title: task.title.en }] : [];
});

// What the content-audit gate does to the static bank: per category the
// audit has reached, how many items are served on a review, served with no
// claim, and withheld, by reason. A category is listed when it is in the
// completed scope or any of its items has a registry row. The override layer
// is not read here, so this is the repository's answer, not production's.
const reviewedIds = new Set(REVIEW_REGISTRY.map((row) => row.id));
const reached = new Set<string>([...AUDITED_CATEGORIES, ...questions.filter((question) => reviewedIds.has(question.id)).map((question) => question.category)]);
const gate = Object.fromEntries(
  [...reached].sort().map((category) => {
    const inCategory = questions.filter((question) => question.category === category);
    const reasons: Record<string, number> = {};
    let served = 0;
    let reviewed = 0;
    for (const question of inCategory) {
      const eligibility = questionEligibility(question);
      if (eligibility.active) {
        served++;
        if (eligibility.reason === 'reviewed') reviewed++;
      } else reasons[eligibility.reason] = (reasons[eligibility.reason] ?? 0) + 1;
    }
    return [category, { complete: AUDITED_CATEGORIES.has(category), authored: inCategory.length, served, servedOnReview: reviewed, servedWithoutClaim: served - reviewed, withheld: reasons }];
  }),
);

const report = {
  audit: {
    auditedOn: REGISTRY_AUDITED_ON,
    reviewedItems: REVIEW_REGISTRY.length,
    auditedCategories: [...AUDITED_CATEGORIES].sort(),
    gate,
  },
  totals: {
    questions: questions.length,
    roadmapQuestions: questions.filter((question) => question.id.startsWith('rm-')).length,
    legacyQuestions: questions.filter((question) => !question.id.startsWith('rm-')).length,
    codingTasks: CODING_TASKS.length,
  },
  categoryCounts,
  questionFlagCount: questionFlags.length,
  questionFlags,
  taskFlagCount: taskFlags.length,
  taskFlags,
};

const details = process.argv.includes('--details');
console.log(JSON.stringify(details ? report : {
  audit: report.audit,
  totals: report.totals,
  categoryCounts: report.categoryCounts,
  questionFlagCount: report.questionFlagCount,
  taskFlagCount: report.taskFlagCount,
  note: 'Run npm run audit:devshark-content -- --details to list flagged items.',
}, null, 2));
