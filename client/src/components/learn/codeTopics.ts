// The Learn topics whose questions carry code (perf baseline #587 C28). The
// map starts loading the code highlighter (CodeBlock.tsx) when the learner
// reaches for a step of one of them, as it does for the level runner; in the
// other topics a code block is rare and is highlighted as it draws. The
// launch contracts keep the list equal to the topics where at least one
// question in five carries a fenced code block (scripts/learn-code-topics-contract.ts).
export const CODE_QUESTION_TOPICS: readonly string[] = ['javascript', 'typescript', 'react', 'dsa', 'git'];

export const hasCodeQuestions = (topic: string): boolean => CODE_QUESTION_TOPICS.includes(topic);
