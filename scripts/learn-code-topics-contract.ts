// The Learn topics whose questions carry code (perf baseline #587 C28). The
// map starts loading the code highlighter when the learner reaches for a step
// of one of them (client/src/components/learn/codeTopics.ts). The list is a
// fact about the question banks, so this keeps it one: a topic is on it when
// at least one question in five carries a fenced code block, which the runner
// draws with the highlighter. Run from scripts/test-launch-contracts.ts.

import assert from 'node:assert/strict';
import * as banks from '../lib/roadmap-questions';
import { ROADMAP_TOPICS } from '../lib/roadmap';
import { CODE_QUESTION_TOPICS } from '../client/src/components/learn/codeTopics';

const SHARE = 1 / 5;

export function learnCodeTopicsContracts() {
  const byTopic = new Map<string, { all: number; code: number }>();
  for (const bank of Object.values(banks)) {
    if (!Array.isArray(bank)) continue;
    for (const question of bank as { category?: string }[]) {
      const topic = String(question.category);
      const counts = byTopic.get(topic) ?? { all: 0, code: 0 };
      counts.all += 1;
      if (JSON.stringify(question).includes('```')) counts.code += 1;
      byTopic.set(topic, counts);
    }
  }
  const expected = ROADMAP_TOPICS.filter((topic) => {
    const counts = byTopic.get(topic);
    return counts !== undefined && counts.code / counts.all >= SHARE;
  });
  assert.deepEqual([...CODE_QUESTION_TOPICS].sort(), [...expected].sort(),
    `the topics the map warms the highlighter for are those whose questions carry code (${JSON.stringify(Object.fromEntries([...byTopic].map(([topic, c]) => [topic, `${c.code}/${c.all}`])))})`);
  console.log(`PASS Learn code topics: the highlighter is warmed for ${expected.join(', ')}, the topics where a fifth or more of the questions carry code`);
}
