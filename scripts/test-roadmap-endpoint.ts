// Exercises the real /api/quiz/roadmap handler (no Supabase env → falls back to
// the static question bank) for the newly added Next.js and Node.js topics.

import handler from '../api/quiz/roadmap';

type Res = {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
};

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
    end() { return this; },
  };
  return res as Res & typeof res;
}

async function call(query: Record<string, string>): Promise<Res> {
  const req: any = { method: 'GET', query, headers: {}, body: {} };
  const res = mockRes();
  await handler(req, res);
  return res;
}

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (cond) { console.log('  ✓ ' + msg); }
  else { failures++; console.error('  ✗ ' + msg); }
};

(async () => {
  // 1) Structure includes both new topics with the right level counts.
  console.log('\nStructure:');
  const structure = await call({});
  check(structure.statusCode === 200, 'GET /roadmap → 200');
  const topics: string[] = structure.body?.topics ?? [];
  check(topics.includes('nextjs'), 'topics include nextjs');
  check(topics.includes('nodejs'), 'topics include nodejs');
  check(structure.body?.structure?.nextjs?.levels?.length === 15, 'nextjs has 15 levels');
  check(structure.body?.structure?.nextjs?.checkpoints?.length === 3, 'nextjs has 3 checkpoints');
  check(structure.body?.structure?.nodejs?.levels?.length === 25, 'nodejs has 25 levels');
  check(structure.body?.structure?.nodejs?.checkpoints?.length === 5, 'nodejs has 5 checkpoints');
  check(topics.includes('dsa'), 'topics include dsa');
  check(structure.body?.structure?.dsa?.levels?.length === 15, 'dsa has 15 levels');
  check(structure.body?.structure?.dsa?.checkpoints?.length === 3, 'dsa has 3 checkpoints');

  // DSA level + checkpoint resolve to real questions.
  const dsaLvl = await call({ topic: 'dsa', level: '15' });
  check(dsaLvl.body?.questions?.length === 8, 'dsa level 15 returns 8 questions');
  const dsaCp = await call({ topic: 'dsa', checkpoint: '3' });
  check(dsaCp.body?.questions?.length === 40 && dsaCp.body?.passPct === 85, 'dsa checkpoint 3 → 40 questions @ 85%');

  // 2) A Next.js level returns 8 fully-formed, answerable questions.
  console.log('\nNext.js level 15:');
  const nextLvl = await call({ topic: 'nextjs', level: '15' });
  check(nextLvl.statusCode === 200, 'level 15 → 200');
  check(nextLvl.body?.kind === 'level' && nextLvl.body?.ref === 15, 'kind=level ref=15');
  check(Array.isArray(nextLvl.body?.questions) && nextLvl.body.questions.length === 8, 'returns 8 questions');
  const okNext = (nextLvl.body?.questions ?? []).every(
    (q: any) => q.category === 'nextjs' && q.options.length >= 2 &&
      q.correctAnswer >= 0 && q.correctAnswer < q.options.length && q.explanation,
  );
  check(okNext, 'every question is well-formed with a valid shuffled answer index');

  // 3) A Node.js checkpoint returns the full 40-question exam.
  console.log('\nNode.js checkpoint 5 (final):');
  const nodeCp = await call({ topic: 'nodejs', checkpoint: '5' });
  check(nodeCp.statusCode === 200, 'checkpoint 5 → 200');
  check(nodeCp.body?.kind === 'checkpoint', 'kind=checkpoint');
  check(nodeCp.body?.questions?.length === 40, 'returns 40 questions');
  check(nodeCp.body?.passPct === 85, 'pass threshold is 85%');

  // 4) A Node.js mid level works too.
  console.log('\nNode.js level 1:');
  const nodeLvl = await call({ topic: 'nodejs', level: '1' });
  check(nodeLvl.body?.questions?.length === 8, 'level 1 returns 8 questions');

  // 5) Out-of-range level for a 15-level topic is rejected.
  console.log('\nValidation:');
  const badNext = await call({ topic: 'nextjs', level: '16' });
  check(badNext.statusCode === 400, 'nextjs level 16 → 400 (only 15 levels)');
  const badNodeCp = await call({ topic: 'nodejs', checkpoint: '6' });
  check(badNodeCp.statusCode === 400, 'nodejs checkpoint 6 → 400 (only 5 checkpoints)');

  if (failures > 0) {
    console.error(`\n❌ ${failures} endpoint check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ All roadmap endpoint checks passed');
})().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
